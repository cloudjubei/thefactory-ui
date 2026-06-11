import { useCallback, useEffect, useRef, useState } from 'react'
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
  /** Fetch (or refresh) the diff preview. Clears a prior error, enabling retry. */
  loadPreview: () => Promise<void>
  /** Re-fetch the run record (retry after a failed load). */
  reload: () => void
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
  const [fetchNonce, setFetchNonce] = useState(0)
  // Bumped whenever the target run changes; in-flight responses from a prior
  // epoch are discarded so a remounted-in-place panel (keyed rows can reuse the
  // component for a different run) never shows another run's diff or result.
  const epochRef = useRef(0)

  useEffect(() => {
    epochRef.current += 1
    setArtifact(undefined)
    setPreview(undefined)
    setApplyResult(undefined)
    setError(undefined)
    setLoading(false)
    if (!runId) return
    const epoch = epochRef.current
    setLoading(true)
    void getCliAgentRun({ path: { runId }, throwOnError: true })
      .then(({ data }) => {
        if (epoch === epochRef.current) setArtifact(filesEmittedArtifactOf(data.artifacts))
      })
      .catch((err: unknown) => {
        if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (epoch === epochRef.current) setLoading(false)
      })
  }, [runId, fetchNonce])

  const reload = useCallback(() => setFetchNonce((n) => n + 1), [])

  const loadPreview = useCallback(async () => {
    if (!runId || !projectId || !artifact) return
    const epoch = epochRef.current
    setPreviewLoading(true)
    setError(undefined)
    try {
      const { data } = await previewCliAgentArtifact({
        path: { runId, artifactId: artifact.id },
        body: { projectId },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setPreview(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPreviewLoading(false)
    }
  }, [runId, projectId, artifact])

  const apply = useCallback(async () => {
    if (!runId || !projectId || !artifact) return
    const epoch = epochRef.current
    setApplying(true)
    setError(undefined)
    try {
      const { data } = await applyCliAgentArtifact({
        path: { runId, artifactId: artifact.id },
        body: { projectId },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setApplyResult(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
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
    reload,
    apply,
    applying,
    applyResult,
    error,
  }
}
