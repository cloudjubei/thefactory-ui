import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { censusFeatures, incompleteStoryReason } from 'thefactory-tools/utils'

import type { ProjectChecksListing, ReviewEvidenceRef } from '../api/generated'
import { listCliAgentRunSummaries, listProcessRuns, useApi, useAuth } from '../api'
import { useStories } from '../contexts/StoriesContext'
import type { StorySignoffSources } from '../utils/processViewCacheTypes'
import { storySignoffSourceCache } from './processViewCache'
import {
  createCoalescedRefresh,
  isRunStateUpdate,
  isRunUpdateForProject,
} from '../utils/runUpdateRefresh'
import {
  applyStorySignoffRunUpdate,
  buildStorySignoff,
  signoffLoadStatus,
} from '../utils/storySignoff'
import type {
  SignoffLoadStatus,
  SignoffSources,
  SignoffSourceState,
  StorySignoff,
  StorySignoffRunUpdate,
} from '../utils/storySignoffTypes'
import type { EvidenceLoadState } from '../utils/verifyProofTypes'

const EMPTY_PROCESS_RUNS: ProcessRun[] = []
const EMPTY_CLI_RUNS: StorySignoffSources['cliRuns'] = []

export type UseStorySignoff = {
  /**
   * The whole-story sign-off, once everything it is computed from has loaded;
   * undefined until then, so no verdict is ever drawn from part of it.
   */
  signoff: StorySignoff | undefined
  status: SignoffLoadStatus
  /** Where each source stands — the frame names what it is still reading. */
  sources: SignoffSources
  loading: boolean
  error: string | undefined
  refresh: () => Promise<void>
}

/** The sources this instance holds, for the `projectId|storyId` they were read for — each as it arrived. */
type HeldSources = {
  key: string
  processRuns: ProcessRun[] | undefined
  cliRuns: StorySignoffSources['cliRuns'] | undefined
}

function cachedSources(key: string): HeldSources {
  const cached = storySignoffSourceCache.get(key)
  return { key, processRuns: cached?.processRuns, cliRuns: cached?.cliRuns }
}

/**
 * The story's sign-off, kept live.
 *
 * A story's per-feature verification cannot be read in one shot — no endpoint
 * aggregates it — but it can be JOINED from two list calls: every process run
 * (which carries the feature↔run attribution) and every CLI run's SUMMARY
 * (which carries each run's verification/verdict/cost, without the transcript
 * and artifact contents that made the full listing hundreds of MB). The join + the aggregate verdict are
 * pure ({@link buildStorySignoff}); this hook only feeds it what those endpoints
 * returned, plus the evidence the caller already loaded and the story's own
 * feature list (for titles and the "unfinished" reason).
 *
 * `storyRunId` is the story run being signed off: each feature is read from its
 * run under it, so a relaunch is signed off on its own attempts, not every run
 * before it.
 *
 * Evidence is passed IN rather than fetched again: the sign-off surface already
 * holds it (for the image tiles), and re-pulling it here would double the work —
 * with where its load stands, since the sign-off waits for it too.
 *
 * Nothing is built until the runs, the story and the evidence have each loaded
 * for THIS story ({@link signoffLoadStatus}): built early, no process run scopes
 * it, so every earlier run's filings show and every feature reads as not
 * verified — a verdict that then flips once the runs arrive. Each source is
 * held as it arrives and `sources` says where each stands, so the frame can
 * name what is still on its way. A live re-list keeps the last complete
 * sign-off rather than going back to loading.
 *
 * Live without re-reading: a `process:run-update` carries the whole record, so
 * a run of this story is put in place from the push itself
 * ({@link applyStorySignoffRunUpdate}); only a CLI run's state change re-reads
 * the summaries — a verify finishing on a feature moves that feature's verdict
 * without a navigate-away.
 *
 * `projectChecks` is the project's checks scan (`useProjectChecks`), passed in
 * like the evidence: waited for, so a chip never flips under a drawn verdict,
 * but never fatal — without it the chips read as they always have.
 *
 * What it last joined from outlives the view (`processViewCache`): reopening a
 * sign-off draws from that at once and re-reads behind it.
 */
export function useStorySignoff(
  projectId: string | undefined,
  storyId: string | undefined,
  storyRunId: string | undefined,
  evidence: readonly ReviewEvidenceRef[],
  evidenceState: EvidenceLoadState,
  projectChecks?: { scan: ProjectChecksListing | undefined; state: SignoffSourceState },
): UseStorySignoff {
  const { token } = useAuth()
  const { ws } = useApi()
  const { getStory, isLoaded: storiesLoaded, loadError: storiesError } = useStories()
  const key = `${projectId ?? ''}|${storyId ?? ''}`
  const [held, setHeld] = useState<HeldSources>(() => cachedSources(key))
  const [reads, setReads] = useState(0)
  const [failure, setFailure] = useState<{ key: string; message: string } | undefined>()
  const keyRef = useRef(key)
  keyRef.current = key
  const sources = held.key === key ? held : cachedSources(key)
  const processRuns = sources.processRuns ?? EMPTY_PROCESS_RUNS
  const cliRuns = sources.cliRuns ?? EMPTY_CLI_RUNS

  const hold = useCallback((requestKey: string, part: Partial<Omit<HeldSources, 'key'>>) => {
    setHeld((prev) => {
      const base = prev.key === requestKey ? prev : cachedSources(requestKey)
      const next = { ...base, ...part }
      if (next.processRuns && next.cliRuns) {
        storySignoffSourceCache.set(requestKey, {
          processRuns: next.processRuns,
          cliRuns: next.cliRuns,
        })
      }
      return keyRef.current === requestKey ? next : prev
    })
  }, [])

  const read = useCallback(
    async <T>(requestKey: string, load: () => Promise<T>, keep: (value: T) => void) => {
      setReads((n) => n + 1)
      try {
        const value = await load()
        if (keyRef.current === requestKey) keep(value)
      } catch (err) {
        if (keyRef.current !== requestKey) return
        setFailure({ key: requestKey, message: err instanceof Error ? err.message : String(err) })
      } finally {
        setReads((n) => n - 1)
      }
    },
    [],
  )

  const readProcessRuns = useCallback(async () => {
    if (!projectId || !storyId) return
    const requestKey = `${projectId}|${storyId}`
    // NOT `rootOnly`: the per-feature CHILD process runs are what carry the
    // `featureId`, so the attribution comes from them, not the root run.
    await read(
      requestKey,
      async () =>
        ((await listProcessRuns({ query: { projectId, storyId }, throwOnError: true })).data as
          | ProcessRun[]
          | undefined) ?? [],
      (runs) => hold(requestKey, { processRuns: runs }),
    )
  }, [projectId, storyId, read, hold])

  const readCliRuns = useCallback(async () => {
    if (!projectId || !storyId) return
    const requestKey = `${projectId}|${storyId}`
    await read(
      requestKey,
      async () =>
        (await listCliAgentRunSummaries({ query: { projectId, storyId }, throwOnError: true }))
          .data ?? [],
      (runs) => hold(requestKey, { cliRuns: runs }),
    )
  }, [projectId, storyId, read, hold])

  const refresh = useCallback(async () => {
    if (!projectId || !storyId) {
      setHeld({ key, processRuns: [], cliRuns: [] })
      return
    }
    setFailure(undefined)
    await Promise.all([readProcessRuns(), readCliRuns()])
  }, [projectId, storyId, key, readProcessRuns, readCliRuns])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  // One re-read at a time, and never for a streamed transcript entry: an eval
  // streaming beside an open sign-off re-listed per token until the backend ran out of heap.
  const readCliRunsCoalesced = useMemo(() => createCoalescedRefresh(readCliRuns), [readCliRuns])
  useEffect(() => {
    if (!token || !projectId || !storyId) return
    const scope = { projectId, storyId }
    const offRun = ws.on('cli:run-update', (data: unknown) => {
      if (isRunStateUpdate(data) && isRunUpdateForProject(data, projectId)) {
        void readCliRunsCoalesced()
      }
    })
    const offProc = ws.on('process:run-update', (data: unknown) => {
      const requestKey = `${projectId}|${storyId}`
      setHeld((prev) => {
        if (prev.key !== requestKey || !prev.processRuns) return prev
        const next = applyStorySignoffRunUpdate(
          prev.processRuns,
          data as StorySignoffRunUpdate,
          scope,
        )
        if (next === prev.processRuns) return prev
        if (prev.cliRuns)
          storySignoffSourceCache.set(requestKey, { processRuns: next, cliRuns: prev.cliRuns })
        return { ...prev, processRuns: next }
      })
    })
    const offReconnect = ws.onReconnect(() => void refresh())
    return () => {
      offRun()
      offProc()
      offReconnect()
    }
  }, [ws, token, projectId, storyId, readCliRunsCoalesced, refresh])

  const story = getStory(storyId ?? '')
  const features = useMemo(
    () => (story?.features ?? []).map((f) => ({ id: f.id, title: f.title })),
    [story],
  )
  const storyIncomplete = useMemo(
    () => (story ? incompleteStoryReason(censusFeatures(story.features)) : undefined),
    [story],
  )

  const error = failure?.key === key ? failure.message : undefined
  const runsHeld = sources.processRuns !== undefined && sources.cliRuns !== undefined
  const runsState: SignoffSourceState = runsHeld
    ? 'loaded'
    : error !== undefined
      ? 'failed'
      : 'loading'
  const storiesState: SignoffSourceState = storiesLoaded
    ? 'loaded'
    : storiesError
      ? 'failed'
      : 'loading'
  const sourceStates: SignoffSources = useMemo(
    () => ({
      runs: runsState,
      stories: storiesState,
      evidence: evidenceState,
      ...(projectChecks ? { checks: projectChecks.state } : {}),
    }),
    [runsState, storiesState, evidenceState, projectChecks?.state],
  )
  const status = signoffLoadStatus(sourceStates)
  const ready = status === 'ready'

  const scan = projectChecks?.scan
  const signoff = useMemo(
    () =>
      ready
        ? buildStorySignoff({
            features,
            processRuns,
            cliRuns,
            evidence,
            ...(storyRunId ? { storyRunId } : {}),
            ...(storyIncomplete ? { storyIncomplete } : {}),
            ...(scan ? { projectChecks: scan, now: Date.now() } : {}),
          })
        : undefined,
    [ready, features, processRuns, cliRuns, evidence, storyRunId, storyIncomplete, scan],
  )

  return {
    signoff,
    status,
    sources: sourceStates,
    loading: reads > 0,
    error: error ?? storiesError?.message,
    refresh,
  }
}
