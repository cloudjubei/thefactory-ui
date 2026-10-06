import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGroupNote,
  deleteGroupNote,
  listGroupNotes,
  revealGroupNote,
  updateGroupNote,
  type GroupNoteSummary,
} from '../api'
import { useAuth } from '../api/AuthContext'
import { invalidateReferenceGroup } from './useReferences'
import { sortNotes } from '../utils/projectNotes'
import type { ProjectNoteCreateBody, ProjectNotePatchBody } from '../utils/projectNotesTypes'
import type { UseNotes } from './useProjectNotes'

/**
 * A projects group's own notes and secrets — context the user writes once for
 * every project in the group, which the group's chats and every agent working in
 * one of its projects can reach for. The same shape as {@link useProjectNotes},
 * addressed by group.
 *
 * Pass `groupId === undefined` to idle — the list stays empty and every
 * mutation rejects rather than hitting an unaddressed route.
 */
export function useGroupNotes(groupId: string | undefined): UseNotes<GroupNoteSummary> {
  const { token } = useAuth()
  const [notes, setNotes] = useState<GroupNoteSummary[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!groupId) {
      setNotes([])
      setIsLoaded(true)
      return
    }
    try {
      const { data } = await listGroupNotes({ path: { groupId }, throwOnError: true })
      setNotes(sortNotes(data))
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [groupId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  const requireGroup = useCallback((): string => {
    if (!groupId) throw new Error('No group selected.')
    return groupId
  }, [groupId])

  const createNote = useCallback(
    async (input: ProjectNoteCreateBody) => {
      await createGroupNote({ path: { groupId: requireGroup() }, body: input, throwOnError: true })
      invalidateReferenceGroup(requireGroup())
      await refresh()
    },
    [requireGroup, refresh],
  )

  const updateNote = useCallback(
    async (noteId: string, patch: ProjectNotePatchBody) => {
      await updateGroupNote({
        path: { groupId: requireGroup(), noteId },
        body: patch,
        throwOnError: true,
      })
      invalidateReferenceGroup(requireGroup())
      await refresh()
    },
    [requireGroup, refresh],
  )

  const deleteNote = useCallback(
    async (noteId: string) => {
      await deleteGroupNote({ path: { groupId: requireGroup(), noteId }, throwOnError: true })
      invalidateReferenceGroup(requireGroup())
      await refresh()
    },
    [requireGroup, refresh],
  )

  const revealNote = useCallback(
    async (noteId: string): Promise<string> => {
      const { data } = await revealGroupNote({
        path: { groupId: requireGroup(), noteId },
        throwOnError: true,
      })
      return data.value
    },
    [requireGroup],
  )

  return useMemo<UseNotes<GroupNoteSummary>>(
    () => ({ isLoaded, loadError, notes, refresh, createNote, updateNote, deleteNote, revealNote }),
    [isLoaded, loadError, notes, refresh, createNote, updateNote, deleteNote, revealNote],
  )
}
