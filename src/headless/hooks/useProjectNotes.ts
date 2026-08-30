import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createProjectNote,
  deleteProjectNote,
  listProjectNotes,
  revealProjectNote,
  updateProjectNote,
  type ProjectNoteSummary,
} from '../api'
import { useAuth } from '../api/AuthContext'
import { sortNotes } from '../utils/projectNotes'
import type { ProjectNoteCreateBody, ProjectNotePatchBody } from '../utils/projectNotesTypes'

export type UseProjectNotes = {
  isLoaded: boolean
  loadError: Error | null
  /** Note summaries in display order. Never carries a stored value. */
  notes: ProjectNoteSummary[]
  refresh: () => Promise<void>
  createNote: (input: ProjectNoteCreateBody) => Promise<void>
  updateNote: (noteId: string, patch: ProjectNotePatchBody) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  /**
   * Deliberate, user-initiated read of one stored value. Only ever called from
   * an explicit Reveal action — never to render a list — and the value is
   * returned straight to the caller rather than kept in hook state.
   */
  revealNote: (noteId: string) => Promise<string>
}

/**
 * Per-project store of standing context an agent can reach for — logins for an
 * app under test, API keys, conventions. Standalone hook (no context) because
 * the surface is per-project; mirrors the CRUD shape of the settings contexts
 * (`WebSearchKeysContext`, `ProviderConnectionsContext`) with a `projectId`
 * added to every path.
 *
 * Pass `projectId === undefined` to idle — the list stays empty and every
 * mutation rejects rather than hitting an unaddressed route.
 */
export function useProjectNotes(projectId: string | undefined): UseProjectNotes {
  const { token } = useAuth()
  const [notes, setNotes] = useState<ProjectNoteSummary[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setNotes([])
      setIsLoaded(true)
      return
    }
    try {
      const { data } = await listProjectNotes({ path: { projectId }, throwOnError: true })
      setNotes(sortNotes(data))
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [projectId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  const requireProject = useCallback((): string => {
    if (!projectId) throw new Error('No project selected.')
    return projectId
  }, [projectId])

  const createNote = useCallback(
    async (input: ProjectNoteCreateBody) => {
      await createProjectNote({
        path: { projectId: requireProject() },
        body: input,
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const updateNote = useCallback(
    async (noteId: string, patch: ProjectNotePatchBody) => {
      await updateProjectNote({
        path: { projectId: requireProject(), noteId },
        body: patch,
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const deleteNote = useCallback(
    async (noteId: string) => {
      await deleteProjectNote({
        path: { projectId: requireProject(), noteId },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const revealNote = useCallback(
    async (noteId: string): Promise<string> => {
      const { data } = await revealProjectNote({
        path: { projectId: requireProject(), noteId },
        throwOnError: true,
      })
      return data.value
    },
    [requireProject],
  )

  return useMemo<UseProjectNotes>(
    () => ({
      isLoaded,
      loadError,
      notes,
      refresh,
      createNote,
      updateNote,
      deleteNote,
      revealNote,
    }),
    [isLoaded, loadError, notes, refresh, createNote, updateNote, deleteNote, revealNote],
  )
}
