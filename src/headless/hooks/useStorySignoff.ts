import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { censusFeatures, incompleteStoryReason } from 'thefactory-tools/utils'

import type { CliRun, ReviewEvidenceRef } from '../api/generated'
import { listCliAgentRuns, listProcessRuns, useApi, useAuth } from '../api'
import { useStories } from '../contexts/StoriesContext'
import { buildStorySignoff } from '../utils/storySignoff'
import type { StorySignoff } from '../utils/storySignoffTypes'

export type UseStorySignoff = {
  /** The whole-story sign-off, always defined (empty → a not-run verdict). */
  signoff: StorySignoff
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
 * Evidence is passed IN rather than fetched again: the sign-off surface already
 * holds it (for the image tiles), and re-pulling it here would double the work.
 * Live: any run or process update re-joins — a verify finishing on a feature
 * moves that feature's verdict without a navigate-away.
 */
export function useStorySignoff(
  projectId: string | undefined,
  storyId: string | undefined,
  evidence: readonly ReviewEvidenceRef[],
): UseStorySignoff {
  const { token } = useAuth()
  const { ws } = useApi()
  const { getStory } = useStories()
  const [processRuns, setProcessRuns] = useState<ProcessRun[]>([])
  const [cliRuns, setCliRuns] = useState<CliRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const refresh = useCallback(async () => {
    if (!projectId || !storyId) {
      setProcessRuns([])
      setCliRuns([])
      return
    }
    setLoading(true)
    setError(undefined)
    try {
      // NOT `rootOnly`: the per-feature CHILD process runs are what carry the
      // `featureId`, so the attribution comes from them, not the root run.
      const [proc, cli] = await Promise.all([
        listProcessRuns({ query: { projectId, storyId }, throwOnError: true }),
        listCliAgentRuns({ query: { projectId, storyId }, throwOnError: true }),
      ])
      setProcessRuns((proc.data as ProcessRun[] | undefined) ?? [])
      setCliRuns((cli.data as CliRun[] | undefined) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [projectId, storyId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    const offRun = ws.on('cli:run-update', () => void refresh())
    const offProc = ws.on('process:run-update', () => void refresh())
    return () => {
      offRun()
      offProc()
    }
  }, [ws, token, refresh])

  const story = getStory(storyId ?? '')
  const features = useMemo(
    () => (story?.features ?? []).map((f) => ({ id: f.id, title: f.title })),
    [story],
  )
  const storyIncomplete = useMemo(
    () => (story ? incompleteStoryReason(censusFeatures(story.features)) : undefined),
    [story],
  )

  const signoff = useMemo(
    () =>
      buildStorySignoff({
        features,
        processRuns,
        cliRuns,
        evidence,
        ...(storyIncomplete ? { storyIncomplete } : {}),
      }),
    [features, processRuns, cliRuns, evidence, storyIncomplete],
  )

  return { signoff, loading, error, refresh }
}
