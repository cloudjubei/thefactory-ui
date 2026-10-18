import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { startAppWork } from '../api/appWorkStart'
import type { BridgeRequest } from '../utils/appBridge'
import {
  isWorkStartRequest,
  parseWorkStartPayload,
  workStartDeclined,
  workStartDraftError,
  workStartStarted,
} from '../utils/appWorkStart'
import {
  APP_WORK_START_CLOSED,
  APP_WORK_START_FAILED,
  APP_WORK_START_NO_PROJECT,
} from '../utils/appWorkStartConstants'
import { AppWorkStartStore } from '../utils/appWorkStartStore'
import type {
  AppWorkStartAsk,
  AppWorkStartDraft,
  AppWorkStartReply,
} from '../utils/appWorkStartTypes'

export interface UseAppWorkStart {
  /** The ask the person is answering, or `null`. Draw it over the App view. */
  ask: AppWorkStartAsk | null
  /**
   * Takes an `overseer:work.start` request and returns its answer, settled when the person
   * answers — never on a timer. Any other request returns `null`.
   */
  handleBridgeMessage: (req: BridgeRequest) => Promise<AppWorkStartReply> | null
  edit: (draft: AppWorkStartDraft) => void
  /** Make the story and its features, then start the run; a failure stays on the ask for another Start. */
  start: () => void
  /** Decline the ask: nothing is made. */
  cancel: () => void
}

/**
 * An embedded app's `work.start`: the person confirms (and may edit) the work over the App view
 * before anything is made. `mountKey` names the mounted app; when it changes or the App view goes
 * away, every open ask is declined with a reason, since the app that asked is gone.
 */
export function useAppWorkStart(projectId: string | undefined, mountKey: string): UseAppWorkStart {
  const [store] = useState(() => new AppWorkStartStore())
  const ask = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(listener), [store]),
    () => store.current(),
    () => store.current(),
  )

  useEffect(() => () => store.declineAll(APP_WORK_START_CLOSED), [store, mountKey])

  const handleBridgeMessage = useCallback(
    (req: BridgeRequest) => {
      if (!isWorkStartRequest(req)) return null
      if (!projectId) return Promise.reject(new Error(APP_WORK_START_NO_PROJECT))
      const draft = parseWorkStartPayload(req.payload)
      if ('error' in draft) return Promise.reject(new Error(draft.error))
      return store.enqueue(draft)
    },
    [projectId, store],
  )

  const edit = useCallback(
    (draft: AppWorkStartDraft) => {
      const current = store.current()
      if (current) store.edit(current.id, draft)
    },
    [store],
  )

  const start = useCallback(() => {
    const current = store.current()
    if (!current || current.busy) return
    if (!projectId) {
      store.fail(current.id, APP_WORK_START_NO_PROJECT)
      return
    }
    const invalid = workStartDraftError(current.draft)
    if (invalid) {
      store.fail(current.id, invalid)
      return
    }
    store.setBusy(current.id, true)
    startAppWork(projectId, current.draft, current.progress, (progress) =>
      store.setProgress(current.id, progress),
    )
      .then(({ storyId, runId }) => store.settle(current.id, workStartStarted(storyId, runId)))
      .catch((err: unknown) =>
        store.fail(current.id, err instanceof Error ? err.message : APP_WORK_START_FAILED),
      )
  }, [projectId, store])

  const cancel = useCallback(() => {
    const current = store.current()
    if (current && !current.busy) store.settle(current.id, workStartDeclined())
  }, [store])

  return { ask, handleBridgeMessage, edit, start, cancel }
}
