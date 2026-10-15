import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  discardChatOpenChanges,
  getChatOpenChanges,
  getCliAgentRun,
  rebuildChatOpenChanges,
  useApi,
} from '../api'
import type { ChatOpenChanges, ChatOpenChangesCard, CliRunReview } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import {
  createCoalescedRefresh,
  isRunStateUpdate,
  isRunUpdateForProject,
} from '../utils/runUpdateRefresh'
import { OPEN_CHANGES_CARD_ERROR } from '../utils/openChangesCardConstants'
import type { OpenChangesCardInput } from '../utils/openChangesCardTypes'

export type UseChatOpenChanges = Omit<OpenChangesCardInput, 'card'> & {
  discard: () => Promise<void>
  rebuild: () => Promise<void>
}

function namesProject(data: unknown, projectId: string): boolean {
  const named = (data as { projectId?: unknown } | undefined)?.projectId
  return typeof named !== 'string' || named === projectId
}

/**
 * A chat's open changes, as the card posted about them shows them: read when
 * the card mounts and again whenever a run's review, the project's git or its
 * files change anywhere — so a decision made on another client, in the review
 * panel or by the chat's agent shows here at once. Once they no longer wait,
 * the card's own run is read to say how they were decided.
 */
export function useChatOpenChanges(card: ChatOpenChangesCard): UseChatOpenChanges {
  const { ws } = useApi()
  const { projectId, chatContextId, runId } = card
  const [openChanges, setOpenChanges] = useState<ChatOpenChanges | null | undefined>(undefined)
  const [cardRunReview, setCardRunReview] = useState<CliRunReview | undefined>(undefined)
  const [busy, setBusy] = useState<'discarding' | 'rebuilding' | undefined>(undefined)
  const [conflicts, setConflicts] = useState<OpenChangesCardInput['conflicts']>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const alive = useRef(true)

  const read = useCallback(async () => {
    try {
      const { data } = await getChatOpenChanges({
        query: { projectId, chatContextId },
        throwOnError: true,
      })
      if (!alive.current) return
      // The generated client reads the nullable body as `{} | null`.
      const current = (data.openChanges as ChatOpenChanges | null | undefined) ?? null
      setOpenChanges(current)
      if (current) return
      const run = await getCliAgentRun({ path: { runId }, throwOnError: true })
      if (alive.current) setCardRunReview(run.data.review)
    } catch (err) {
      if (alive.current) setError(extractErrorMessage(err, OPEN_CHANGES_CARD_ERROR))
    }
  }, [projectId, chatContextId, runId])

  const refresh = useMemo(() => createCoalescedRefresh(read), [read])

  useEffect(() => {
    alive.current = true
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
  }, [ws, projectId, refresh])

  const discard = useCallback(async () => {
    setBusy('discarding')
    setConflicts(undefined)
    setError(undefined)
    try {
      await discardChatOpenChanges({ body: { projectId, chatContextId }, throwOnError: true })
    } catch (err) {
      if (alive.current) setError(extractErrorMessage(err, OPEN_CHANGES_CARD_ERROR))
    } finally {
      if (alive.current) setBusy(undefined)
      void refresh()
    }
  }, [projectId, chatContextId, refresh])

  const rebuild = useCallback(async () => {
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
      if (alive.current) setError(extractErrorMessage(err, OPEN_CHANGES_CARD_ERROR))
    } finally {
      if (alive.current) setBusy(undefined)
      void refresh()
    }
  }, [projectId, chatContextId, refresh])

  return {
    openChanges,
    ...(cardRunReview ? { cardRunReview } : {}),
    ...(busy ? { busy } : {}),
    ...(conflicts ? { conflicts } : {}),
    ...(error ? { error } : {}),
    discard,
    rebuild,
  }
}
