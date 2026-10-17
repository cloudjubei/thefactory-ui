import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { discardChatOpenChanges, getChatOpenChanges, rebuildChatOpenChanges, useApi } from '../api'
import type { ChatOpenChanges } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import {
  createCoalescedRefresh,
  isRunStateUpdate,
  isRunUpdateForProject,
} from '../utils/runUpdateRefresh'
import { OPEN_CHANGES_NOTICE_ERROR } from '../utils/openChangesNoticeConstants'
import type { OpenChangesNoticeInput } from '../utils/openChangesNoticeTypes'

/** The chat whose open changes are read: its project and its run key (`getChatContextKey`). */
export type ChatOpenChangesTarget = { projectId: string; chatContextId: string }

export type UseChatOpenChanges = Omit<OpenChangesNoticeInput, 'runId'> & {
  discard: () => Promise<void>
  rebuild: () => Promise<void>
}

function namesProject(data: unknown, projectId: string): boolean {
  const named = (data as { projectId?: unknown } | undefined)?.projectId
  return typeof named !== 'string' || named === projectId
}

/**
 * A chat's open changes, as its change card shows them: read when the card
 * mounts and again whenever a run's review, the project's git or its files
 * change anywhere — so a decision made on another client, on the card or by
 * the chat's agent shows at once. Reads nothing without a target.
 */
export function useChatOpenChanges(target: ChatOpenChangesTarget | undefined): UseChatOpenChanges {
  const { ws } = useApi()
  const projectId = target?.projectId
  const chatContextId = target?.chatContextId
  const [openChanges, setOpenChanges] = useState<ChatOpenChanges | null | undefined>(undefined)
  const [busy, setBusy] = useState<'discarding' | 'rebuilding' | undefined>(undefined)
  const [conflicts, setConflicts] = useState<OpenChangesNoticeInput['conflicts']>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const alive = useRef(true)

  const read = useCallback(async () => {
    if (!projectId || !chatContextId) return
    try {
      const { data } = await getChatOpenChanges({
        query: { projectId, chatContextId },
        throwOnError: true,
      })
      // The generated client reads the nullable body as `{} | null`.
      if (alive.current) setOpenChanges((data.openChanges as ChatOpenChanges | null) ?? null)
    } catch (err) {
      if (alive.current) setError(extractErrorMessage(err, OPEN_CHANGES_NOTICE_ERROR))
    }
  }, [projectId, chatContextId])

  const refresh = useMemo(() => createCoalescedRefresh(read), [read])

  useEffect(() => {
    alive.current = true
    if (!projectId || !chatContextId) {
      return () => {
        alive.current = false
      }
    }
    void refresh()
    const offRun = ws.on('cli:run-update', (data: unknown) => {
      if (isRunStateUpdate(data) && isRunUpdateForProject(data, projectId)) void refresh()
    })
    const offGit = ws.on('git:status-changed', (data: unknown) => {
      if (namesProject(data, projectId)) void refresh()
    })
    const offFiles = ws.on('files:changed', (data: unknown) => {
      if (namesProject(data, projectId)) void refresh()
    })
    const offReconnect = ws.onReconnect(() => void refresh())
    return () => {
      alive.current = false
      offRun()
      offGit()
      offFiles()
      offReconnect()
    }
  }, [ws, projectId, chatContextId, refresh])

  const discard = useCallback(async () => {
    if (!projectId || !chatContextId) return
    setBusy('discarding')
    setConflicts(undefined)
    setError(undefined)
    try {
      await discardChatOpenChanges({ body: { projectId, chatContextId }, throwOnError: true })
    } catch (err) {
      if (alive.current) setError(extractErrorMessage(err, OPEN_CHANGES_NOTICE_ERROR))
    } finally {
      if (alive.current) setBusy(undefined)
      void refresh()
    }
  }, [projectId, chatContextId, refresh])

  const rebuild = useCallback(async () => {
    if (!projectId || !chatContextId) return
    setBusy('rebuilding')
    setConflicts(undefined)
    setError(undefined)
    try {
      const { data } = await rebuildChatOpenChanges({
        body: { projectId, chatContextId },
        throwOnError: true,
      })
      if (alive.current && !data.ok) {
        setConflicts(data.conflicts)
        setError(data.error)
      }
    } catch (err) {
      if (alive.current) setError(extractErrorMessage(err, OPEN_CHANGES_NOTICE_ERROR))
    } finally {
      if (alive.current) setBusy(undefined)
      void refresh()
    }
  }, [projectId, chatContextId, refresh])

  return {
    openChanges,
    ...(busy ? { busy } : {}),
    ...(conflicts ? { conflicts } : {}),
    ...(error ? { error } : {}),
    discard,
    rebuild,
  }
}
