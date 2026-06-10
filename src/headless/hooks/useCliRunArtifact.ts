import { useCallback, useEffect, useState } from 'react'
import {
  applyCliAgentArtifact,
  getCliAgentRun,
  previewCliAgentArtifact,
  type ApplyCliAgentArtifactResult,
  type FilesEmittedArtifact,
  type FilesEmittedPreview,
} from '../api/generated'
import { filesEmittedArtifactOf } from '../utils/cliRunner'

export type UseCliRunArtifact = {
  /** The run's files-emitted artifact (the agent's workspace diff), once loaded. */
  artifact: FilesEmittedArtifact | undefined
  /** True while the run record is being fetched. */
  loading: boolean
  /** Per-file diff preview against the project's current checkout, once loaded. */
  preview: FilesEmittedPreview | undefined
  /** True while the preview is being computed server-side. */
  previewLoading: boolean
  /** Fetch (or refresh) the diff preview. */
  loadPreview: () => Promise<void>
  /** Apply the artifact onto the project checkout. */
  apply: () => Promise<void>
  /** True while an apply is in flight. */
  applying: boolean
  /** Result of the last apply (added/modified/deleted/errors), once applied. */
  applyResult: ApplyCliAgentArtifactResult | undefined
  /** Last fetch/preview/apply failure, for inline display. */
  error: string | undefined
}

/**
 * The chat-side surface for a CLI run's workspace diff: loads the run's
 * `files-emitted` artifact (anchored by the assistant message's `cliRunId`),
 * fetches the per-file diff preview against the project's current checkout, and
 * applies it on demand. Platform-agnostic — the web + native artifact panels
 * are thin renderings of this state.
 */
export function useCliRunArtifact(
  runId: string | undefined,
  projectId: string | undefined,
): UseCliRunArtifact {
  const [artifact, setArtifact] = useState<FilesEmittedArtifact | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<FilesEmittedPreview | undefined>(undefined)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyCliAgentArtifactResult | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    setArtifact(undefined)
    setPreview(undefined)
    setApplyResult(undefined)
    setError(undefined)
    if (!runId) return
    let cancelled = false
    setLoading(true)
    void getCliAgentRun({ path: { runId }, throwOnError: true })
      .then(({ data }) => {
        if (!cancelled) setArtifact(filesEmittedArtifactOf(data.artifacts))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [runId])

  const loadPreview = useCallback(async () => {
    if (!runId || !projectId || !artifact) return
    setPreviewLoading(true)
    setError(undefined)
    try {
      const { data } = await previewCliAgentArtifact({
        path: { runId, artifactId: artifact.id },
        body: { projectId },
        throwOnError: true,
      })
      setPreview(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPreviewLoading(false)
    }
  }, [runId, projectId, artifact])

  const apply = useCallback(async () => {
    if (!runId || !projectId || !artifact) return
    setApplying(true)
    setError(undefined)
    try {
      const { data } = await applyCliAgentArtifact({
        path: { runId, artifactId: artifact.id },
        body: { projectId },
        throwOnError: true,
      })
      setApplyResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [runId, projectId, artifact])

  return {
    artifact,
    loading,
    preview,
    previewLoading,
    loadPreview,
    apply,
    applying,
    applyResult,
    error,
  }
}
