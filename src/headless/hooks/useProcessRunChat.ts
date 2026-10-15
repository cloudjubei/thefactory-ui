import { useCallback, useEffect, useMemo, useState } from 'react'
import { processRunChatContext } from 'thefactory-tools/utils'
import type { ProcessRun } from 'thefactory-tools/types'

import { extractErrorMessage, getProcessRun, openProcessRunChat } from '../api'
import type { ChatContext } from '../api'
import { resolveProcessRunChatRoot } from '../utils/processRunChatRoot'
import type { ProcessRunTreeLink } from '../utils/processRunChatRootTypes'
import { cachedProcessRun } from './processViewCache'
import type { ProcessRunChatOpened } from './useProcessRun'

export type UseProcessRunChat = {
  /**
   * The top run of the tree `run` is in — whose chat every level of the tree
   * opens. `undefined` while a nested run's tree is climbed, or when it cannot be.
   */
  root: ProcessRunTreeLink | undefined
  /** The root's chat, as the chats list keys it. */
  context: ChatContext | undefined
  /** Open the root's chat, creating it the first time. */
  open: () => Promise<ProcessRunChatOpened | undefined>
  /** Why the last open was refused — cleared by the next one. */
  error: string | null
}

async function readTreeLink(runId: string): Promise<ProcessRunTreeLink | undefined> {
  const cached = cachedProcessRun(runId)
  if (cached) return cached
  const { data } = await getProcessRun({ path: { runId }, throwOnError: true })
  return data as ProcessRun
}

/**
 * The chat a process run's page discusses: one chat for the whole run tree,
 * the top run's — so a nested run or a step at any depth opens the same chat
 * as the run it belongs to.
 */
export function useProcessRunChat(run: ProcessRunTreeLink | undefined): UseProcessRunChat {
  const runId = run?.id
  const projectId = run?.projectId
  const parentRunId = run?.parentRunId ?? undefined
  const [climbed, setClimbed] = useState<{ runId: string; root: ProcessRunTreeLink | undefined }>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId || !projectId || !parentRunId) return
    let live = true
    void resolveProcessRunChatRoot({ id: runId, projectId, parentRunId }, readTreeLink).then(
      (root) => {
        if (live) setClimbed({ runId, root })
      },
    )
    return () => {
      live = false
    }
  }, [runId, projectId, parentRunId])

  const climbedRoot = climbed?.runId === runId ? climbed?.root : undefined
  const rootId = !runId || !projectId ? undefined : parentRunId ? climbedRoot?.id : runId
  const rootProjectId = parentRunId ? climbedRoot?.projectId : projectId
  const root = useMemo(
    () => (rootId && rootProjectId ? { id: rootId, projectId: rootProjectId } : undefined),
    [rootId, rootProjectId],
  )
  const context = useMemo(() => (root ? processRunChatContext(root) : undefined), [root])

  const open = useCallback(async (): Promise<ProcessRunChatOpened | undefined> => {
    if (!rootId) return undefined
    setError(null)
    try {
      const { data } = await openProcessRunChat({ path: { runId: rootId }, throwOnError: true })
      return data as ProcessRunChatOpened
    } catch (err) {
      setError(extractErrorMessage(err, 'The run’s chat could not be opened.'))
      return undefined
    }
  }, [rootId])

  return { root, context, open, error }
}
