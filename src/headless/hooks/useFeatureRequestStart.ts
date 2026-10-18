import { useCallback } from 'react'
import type { FeatureRequest, WorkLaunchMode } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { StartWorkOutcome, StartWorkTarget } from '../utils/workLaunchViewTypes'
import { featureRequestsSnapshot, requestById } from './featureRequestsStore'
import type { FeatureRequestDecisionState } from './useFeatureRequestDecision'
import { useStartWork, type StartWorkState } from './useStartWork'

export interface FeatureRequestStart {
  /** The start in progress — draw it with `StartWorkDialog`. */
  start: StartWorkState
  /** Accept the request, its work carried out the way chosen. */
  onAccept: (mode: WorkLaunchMode) => void
  /** Start the work of a request accepted for a process run whose launch was left. */
  onStartWork: (mode: WorkLaunchMode) => void
  /** Start a blocked or failed request's work again, the way chosen. */
  onStartAgain: (mode: WorkLaunchMode) => void
}

function targetOf(request: FeatureRequest, again: boolean): StartWorkTarget | undefined {
  const storyId = request.handling?.storyId
  if (!storyId) return undefined
  const featureIds = request.handling?.featureIds
  return {
    projectId: request.targetProjectId,
    storyId,
    ...(featureIds && featureIds.length > 0 ? { featureIds } : {}),
    request: { id: request.id, again },
  }
}

/**
 * A feature request's starts — accepting it, starting its work, starting it again — as the one
 * choice every start makes: in its chat at once, or a process run through the launch card.
 */
export function useFeatureRequestStart(
  request: FeatureRequest | undefined,
  decision: Pick<FeatureRequestDecisionState, 'accept' | 'startWork' | 'startAgain'>,
  onStarted: (outcome: StartWorkOutcome) => void,
  /** The agent work started in a chat runs on, as a launch carries it. */
  chatAgent?: Record<string, unknown>,
): FeatureRequestStart {
  const start = useStartWork(onStarted, chatAgent)
  const chatChoice = useCallback(
    () => ({ mode: 'chat' as const, ...(chatAgent ? { decision: chatAgent } : {}) }),
    [chatAgent],
  )
  const chatOf = useCallback(
    (r: FeatureRequest): StartWorkOutcome => ({
      mode: 'chat',
      chatContextId:
        r.handling?.work?.chatContextId ??
        getChatContextKey({
          type: 'FEATURE_REQUEST',
          projectId: r.targetProjectId,
          featureRequestId: r.id,
        }),
    }),
    [],
  )

  const onAccept = useCallback(
    (mode: WorkLaunchMode) => {
      if (!request) return
      void decision.accept(mode === 'chat' ? chatChoice() : { mode }).then(() => {
        const placed = requestById(featureRequestsSnapshot(), request.id)
        if (!placed) return
        if (mode === 'chat') {
          if (placed.handling?.work) onStarted(chatOf(placed))
          return
        }
        const target = targetOf(placed, false)
        if (target) start.open(target, 'process')
      })
    },
    [chatChoice, chatOf, decision, onStarted, request, start],
  )

  const onStartWork = useCallback(
    (mode: WorkLaunchMode) => {
      if (!request) return
      if (mode === 'chat') {
        void decision.startWork(chatChoice()).then(() => onStarted(chatOf(request)))
        return
      }
      const target = targetOf(request, false)
      if (target) start.open(target, 'process')
    },
    [chatChoice, chatOf, decision, onStarted, request, start],
  )

  const onStartAgain = useCallback(
    (mode: WorkLaunchMode) => {
      if (!request) return
      if (mode === 'chat') {
        void decision.startAgain(chatChoice()).then(() => onStarted(chatOf(request)))
        return
      }
      const target = targetOf(request, true)
      if (target) start.open(target, 'process')
    },
    [chatChoice, chatOf, decision, onStarted, request, start],
  )

  return { start, onAccept, onStartWork, onStartAgain }
}
