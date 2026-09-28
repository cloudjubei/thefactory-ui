import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { censusFeatures, incompleteStoryReason } from 'thefactory-tools/utils'

import type { CliRun, ReviewEvidenceRef } from '../api/generated'
import { listCliAgentRuns, listProcessRuns, useApi, useAuth } from '../api'
import { useStories } from '../contexts/StoriesContext'
import { createCoalescedRefresh, isRunStateUpdate } from '../utils/runUpdateRefresh'
import { buildStorySignoff, signoffLoadStatus } from '../utils/storySignoff'
import type {
  SignoffLoadStatus,
  SignoffSourceState,
  StorySignoff,
} from '../utils/storySignoffTypes'
import type { EvidenceLoadState } from '../utils/verifyProofTypes'

export type UseStorySignoff = {
  /**
   * The whole-story sign-off, once everything it is computed from has loaded;
   * undefined until then, so no verdict is ever drawn from part of it.
   */
  signoff: StorySignoff | undefined
  status: SignoffLoadStatus
  loading: boolean
  error: string | undefined
  refresh: () => Promise<void>
}

/**
 * The story's sign-off, kept live.
 *
 * A story's per-feature verification cannot be read in one shot — no endpoint
 * aggregates it — but it can be JOINED from two list calls: every process run
 * (which carries the feature↔run attribution) and every CLI run (which carries
 * each run's verification/verdict/cost). The join + the aggregate verdict are
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
 * verified — a verdict that then flips once the runs arrive. A live re-list
 * keeps the last complete sign-off rather than going back to loading.
 *
 * Live: any run or process update re-joins — a verify finishing on a feature
 * moves that feature's verdict without a navigate-away.
 */
export function useStorySignoff(
  projectId: string | undefined,
  storyId: string | undefined,
  storyRunId: string | undefined,
  evidence: readonly ReviewEvidenceRef[],
  evidenceState: EvidenceLoadState,
): UseStorySignoff {
  const { token } = useAuth()
  const { ws } = useApi()
  const { getStory, isLoaded: storiesLoaded, loadError: storiesError } = useStories()
  const [processRuns, setProcessRuns] = useState<ProcessRun[]>([])
  const [cliRuns, setCliRuns] = useState<CliRun[]>([])
  const [loading, setLoading] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string | undefined>()
  const [failure, setFailure] = useState<{ key: string; message: string } | undefined>()
  const key = `${projectId ?? ''}|${storyId ?? ''}`
  const keyRef = useRef(key)
  keyRef.current = key

  const refresh = useCallback(async () => {
    const requestKey = `${projectId ?? ''}|${storyId ?? ''}`
    if (!projectId || !storyId) {
      setProcessRuns([])
      setCliRuns([])
      setLoadedKey(requestKey)
      return
    }
    setLoading(true)
    setFailure(undefined)
    try {
      // NOT `rootOnly`: the per-feature CHILD process runs are what carry the
      // `featureId`, so the attribution comes from them, not the root run.
      const [proc, cli] = await Promise.all([
        listProcessRuns({ query: { projectId, storyId }, throwOnError: true }),
        listCliAgentRuns({ query: { projectId, storyId }, throwOnError: true }),
      ])
      if (keyRef.current !== requestKey) return
      setProcessRuns((proc.data as ProcessRun[] | undefined) ?? [])
      setCliRuns((cli.data as CliRun[] | undefined) ?? [])
      setLoadedKey(requestKey)
    } catch (err) {
      if (keyRef.current !== requestKey) return
      setFailure({ key: requestKey, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }, [projectId, storyId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  // One re-list at a time, and never for a streamed transcript entry: a story's runs are whole records, and an eval
  // streaming beside an open sign-off re-listed them per token until the backend ran out of heap.
  const refreshCoalesced = useMemo(() => createCoalescedRefresh(refresh), [refresh])
  useEffect(() => {
    if (!token) return
    const offRun = ws.on('cli:run-update', (data: unknown) => {
      if (isRunStateUpdate(data)) void refreshCoalesced()
    })
    const offProc = ws.on('process:run-update', () => void refreshCoalesced())
    return () => {
      offRun()
      offProc()
    }
  }, [ws, token, refreshCoalesced])

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
  const runsState: SignoffSourceState =
    loadedKey === key ? 'loaded' : error !== undefined ? 'failed' : 'loading'
  const storiesState: SignoffSourceState = storiesLoaded
    ? 'loaded'
    : storiesError
      ? 'failed'
      : 'loading'
  const status = signoffLoadStatus({
    runs: runsState,
    stories: storiesState,
    evidence: evidenceState,
  })
  const ready = status === 'ready'

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
          })
        : undefined,
    [ready, features, processRuns, cliRuns, evidence, storyRunId, storyIncomplete],
  )

  return { signoff, status, loading, error: error ?? storiesError?.message, refresh }
}
