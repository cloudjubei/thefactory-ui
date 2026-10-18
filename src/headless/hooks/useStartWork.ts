import { useCallback, useState } from 'react'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'
import { extractErrorMessage } from '../api/errorMessage'
import type { StartWorkOutcome, StartWorkTarget } from '../utils/workLaunchViewTypes'
import { startRequestAgain, startRequestWork } from './useCrossProjectRequests'
import { startStoryWorkRequest } from './useWorkLaunch'

export interface StartWorkState {
  /** What is being started, while its choice or launch card is open. */
  target: StartWorkTarget | undefined
  /** The way already chosen — the launch card shows for a process run. */
  mode: WorkLaunchMode | undefined
  busy: boolean
  error: string | undefined
  /** Open the start for `target` — at the choice, or past it with `mode` already chosen. */
  open: (target: StartWorkTarget, mode?: WorkLaunchMode) => void
  /** The person chose: in the chat starts at once, a process run opens its launch card. */
  choose: (mode: WorkLaunchMode) => void
  /** Launch the process run with the launch card's picks. */
  launch: (decision: Record<string, unknown>) => Promise<void>
  close: () => void
  /** The agent the work runs on unless the launch card picks another, as a launch carries it. */
  chatAgent: Record<string, unknown> | undefined
}

function requestChatKey(target: StartWorkTarget): string {
  return getChatContextKey({
    type: 'FEATURE_REQUEST',
    projectId: target.projectId,
    featureRequestId: target.request!.id,
  })
}

async function startTarget(
  target: StartWorkTarget,
  mode: WorkLaunchMode,
  decision: Record<string, unknown> | undefined,
): Promise<StartWorkOutcome> {
  const choice = { mode, ...(decision ? { decision } : {}) }
  if (target.request) {
    const request = target.request.again
      ? await startRequestAgain(target.request.id, choice)
      : await startRequestWork(target.request.id, choice)
    const work = request?.handling?.work
    return mode === 'chat'
      ? { mode, chatContextId: work?.chatContextId ?? requestChatKey(target) }
      : {
          mode,
          ...(work?.processRunId ? { processRunId: work.processRunId } : {}),
          chatContextId: requestChatKey(target),
        }
  }
  const started = await startStoryWorkRequest({
    projectId: target.projectId,
    storyId: target.storyId,
    ...(target.featureIds ? { featureIds: target.featureIds } : {}),
    choice,
  })
  return started.mode === 'chat'
    ? { mode: 'chat', chatContextId: started.chatContextId }
    : {
        mode: 'process',
        chatContextId: started.chatContextId,
        ...(started.processRunId ? { processRunId: started.processRunId } : {}),
      }
}

/**
 * Every "start work" — a story's or a feature's Run, accepting a feature request, starting its
 * work again — as one flow: the choice of a process run or the chat, then either the chat
 * starting at once or the launch card, and `onStarted` told where the work went to open it.
 */
export function useStartWork(
  onStarted: (outcome: StartWorkOutcome) => void,
  /** The agent work started in a chat runs on, as a launch carries it — the chat's own when absent. */
  chatAgent?: Record<string, unknown>,
): StartWorkState {
  const [target, setTarget] = useState<StartWorkTarget>()
  const [mode, setMode] = useState<WorkLaunchMode>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const close = useCallback(() => {
    setTarget(undefined)
    setMode(undefined)
    setError(undefined)
  }, [])

  const run = useCallback(
    async (on: StartWorkTarget, chosen: WorkLaunchMode, decision?: Record<string, unknown>) => {
      setBusy(true)
      setError(undefined)
      try {
        const outcome = await startTarget(on, chosen, decision)
        close()
        onStarted(outcome)
      } catch (err) {
        setError(extractErrorMessage(err, 'The work did not start.'))
        // The launch card shows its own decision's failure, and lets the person try again.
        if (chosen === 'process') throw err
      } finally {
        setBusy(false)
      }
    },
    [close, onStarted],
  )

  const choose = useCallback(
    (chosen: WorkLaunchMode) => {
      if (!target) return
      if (chosen === 'chat') {
        void run(target, 'chat', chatAgent)
        return
      }
      setMode('process')
    },
    [chatAgent, run, target],
  )

  const open = useCallback(
    (next: StartWorkTarget, chosen?: WorkLaunchMode) => {
      setTarget(next)
      setError(undefined)
      setMode(chosen === 'process' ? 'process' : undefined)
      if (chosen === 'chat') void run(next, 'chat', chatAgent)
    },
    [chatAgent, run],
  )

  const launch = useCallback(
    async (decision: Record<string, unknown>) => {
      if (target) await run(target, 'process', decision)
    },
    [run, target],
  )

  return { target, mode, busy, error, open, choose, launch, close, chatAgent }
}
