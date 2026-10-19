import { describe, expect, it } from 'vitest'

import { chatStopCardView, chatStopDetailsLabel, chatStopRestart } from './chatStopNotice'
import { CHAT_STOP_CAUSE_PILL, CHAT_STOP_COPY } from './chatStopNoticeConstants'
import type { ChatStopNotice } from './chatStopNoticeTypes'

const FEATURE = 'Detect refusal repetition'
const REASON = 'Overseer could not send the agent its conversation. Its work is untouched.'

describe('chatStopCardView', () => {
  it('names the feature a story run stopped on, and says it was Overseer’s fault', () => {
    const view = chatStopCardView({
      cause: 'overseer',
      featureTitle: FEATURE,
      reason: REASON,
      raw: "TypeError: Cannot read properties of undefined (reading 'filter')",
    })
    expect(view).toEqual({
      title: CHAT_STOP_COPY.stoppedOn(FEATURE),
      pill: CHAT_STOP_CAUSE_PILL.overseer,
      tone: 'review',
      reason: REASON,
      primaryLabel: CHAT_STOP_COPY.tryAgain,
      details: "TypeError: Cannot read properties of undefined (reading 'filter')",
    })
  })

  it('calls a chat’s own stop “this turn”, with no details when nothing raw was kept', () => {
    const view = chatStopCardView({ cause: 'provider', reason: 'The provider was overloaded.' })
    expect(view.title).toBe(CHAT_STOP_COPY.turnStopped)
    expect(view.pill).toEqual({ label: 'The model provider failed', tone: 'review' })
    expect(view.primaryLabel).toBe('Try again')
    expect(view).not.toHaveProperty('details')
    expect(view).not.toHaveProperty('askAgentDraft')
  })

  it('treats a blank feature title or raw text as absent', () => {
    const view = chatStopCardView({ cause: 'overseer', featureTitle: '  ', reason: 'x', raw: ' ' })
    expect(view.title).toBe('This turn stopped')
    expect(view).not.toHaveProperty('details')
  })

  it('offers the agent a draft built from the reason when its own work failed', () => {
    const view = chatStopCardView({
      cause: 'agent',
      featureTitle: FEATURE,
      reason: 'The type check still fails at McpServer.test.ts line 1778',
    })
    expect(view.pill).toEqual({ label: 'The agent’s work failed', tone: 'blocked' })
    expect(view.tone).toBe('blocked')
    expect(view.askAgentDraft).toBe(
      `The work on “${FEATURE}” stopped: The type check still fails at McpServer.test.ts line 1778. Please fix the cause, then carry on.`,
    )
  })

  it('keeps the reason’s own ending in the draft, and drafts for a chat turn too', () => {
    const view = chatStopCardView({ cause: 'agent', reason: '  The build fails!  ' })
    expect(view.reason).toBe('The build fails!')
    expect(view.askAgentDraft).toBe(
      'Your last turn stopped: The build fails! Please fix the cause, then carry on.',
    )
  })

  it('counts the turns used and offers as many again', () => {
    const view = chatStopCardView({ cause: 'turns', reason: 'Used them all.', turnLimit: 50 })
    expect(view.pill).toEqual({ label: 'Used all 50 turns', tone: 'empty' })
    expect(view.tone).toBe('empty')
    expect(view.primaryLabel).toBe('Carry on with 50 more turns')
    expect(view).not.toHaveProperty('askAgentDraft')
  })

  it('still reads when the turn limit was not recorded', () => {
    const view = chatStopCardView({ cause: 'turns', reason: 'Used them all.', turnLimit: 0 })
    expect(view.pill?.label).toBe(CHAT_STOP_COPY.turnsUsedUnknown)
    expect(view.primaryLabel).toBe(CHAT_STOP_COPY.carryOnUnknown)
  })

  it('says it failed again only from the second stop in a row', () => {
    const base: ChatStopNotice = { cause: 'overseer', reason: 'x' }
    expect(chatStopCardView({ ...base, repeats: 1 })).not.toHaveProperty('repeatLine')
    expect(chatStopCardView(base)).not.toHaveProperty('repeatLine')
    expect(chatStopCardView({ ...base, repeats: 2 }).repeatLine).toBe(
      'Failed again — same cause (2 times)',
    )
    expect(chatStopCardView({ ...base, repeats: 4 }).repeatLine).toBe(CHAT_STOP_COPY.failedAgain(4))
  })

  it('claims no fault for a cause this build does not know', () => {
    const view = chatStopCardView({
      cause: 'sandbox' as ChatStopNotice['cause'],
      reason: 'Something new stopped it.',
    })
    expect(view).not.toHaveProperty('pill')
    expect(view.tone).toBe('empty')
    expect(view.primaryLabel).toBe('Try again')
  })
})

describe('chatStopRestart', () => {
  const restart = { label: 'Run the agent again on this message', disabled: false }

  it('runs the row’s restart when the list offers one', () => {
    expect(chatStopRestart({ restart, hasRetry: true, isLast: true, isThinking: false })).toEqual({
      via: 'restart',
      title: restart.label,
      disabled: false,
    })
  })

  it('keeps a busy restart on screen, refusing', () => {
    const busy = { label: 'Wait for the turn to finish', disabled: true }
    expect(
      chatStopRestart({ restart: busy, hasRetry: false, isLast: true, isThinking: true }),
    ).toEqual({ via: 'restart', title: busy.label, disabled: true })
  })

  it('falls back to the last row’s retry, refused while a turn is answered', () => {
    expect(chatStopRestart({ hasRetry: true, isLast: true, isThinking: false })).toEqual({
      via: 'retry',
      title: CHAT_STOP_COPY.retryTitle,
      disabled: false,
    })
    expect(chatStopRestart({ hasRetry: true, isLast: true, isThinking: true })?.disabled).toBe(true)
  })

  it('offers nothing where the row offers no restart today', () => {
    expect(chatStopRestart({ hasRetry: true, isLast: false, isThinking: false })).toBeUndefined()
    expect(chatStopRestart({ hasRetry: false, isLast: true, isThinking: false })).toBeUndefined()
  })
})

describe('chatStopDetailsLabel', () => {
  it('names what a press of the toggle does', () => {
    expect(chatStopDetailsLabel(false)).toBe('Show details')
    expect(chatStopDetailsLabel(true)).toBe('Hide details')
  })
})
