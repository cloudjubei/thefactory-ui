import { useState } from 'react'
import { STUCK_ANSWER_LABELS } from 'thefactory-tools/constants'

import { useCanonicalizeReferences } from '../contexts/ReferenceRenderingContext'
import { canSendStuckHint, stuckCardView } from '../utils/stuckCard'
import { QUESTION_SEND_FAILED } from '../utils/agentQuestionConstants'
import type { StuckCardView } from '../utils/stuckCardTypes'
import type { PendingQuestionGrant } from '../utils/chatTypes'

export type UseStuckCard = {
  view: StuckCardView | undefined
  /** An answer is on its way. */
  busy: boolean
  error: string | null
  hint: string
  setHint: (text: string) => void
  hintOpen: boolean
  openHint: () => void
  canSendHint: boolean
  sendHint: () => void
  sendContinue: () => void
  /** Stop has been pressed once: the card asks before it is sent. */
  stopAsked: boolean
  askStop: () => void
  keepWaiting: () => void
  sendStop: () => void
}

/**
 * What a stuck card does, the same on every client. It answers through the
 * question's own channel, so it stays as long as the ask does: nothing here
 * expires it. Stop is sent only from the second press.
 */
export function useStuckCard(grant: PendingQuestionGrant): UseStuckCard {
  const view = stuckCardView(grant.question)
  const canonicalize = useCanonicalizeReferences()
  const [hint, setHint] = useState('')
  const [hintOpen, setHintOpen] = useState(false)
  const [stopAsked, setStopAsked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = (text: string) => {
    setBusy(true)
    setError(null)
    grant.answer(text, []).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : QUESTION_SEND_FAILED)
      setBusy(false)
    })
  }

  return {
    view,
    busy,
    error,
    hint,
    setHint,
    hintOpen,
    openHint: () => {
      setStopAsked(false)
      setHintOpen(true)
    },
    canSendHint: canSendStuckHint(hint),
    sendHint: () => {
      if (canSendStuckHint(hint)) send(canonicalize(hint, grant.question.question))
    },
    sendContinue: () => send(STUCK_ANSWER_LABELS.continue),
    stopAsked,
    askStop: () => {
      setHintOpen(false)
      setStopAsked(true)
    },
    keepWaiting: () => setStopAsked(false),
    sendStop: () => send(STUCK_ANSWER_LABELS.stop),
  }
}
