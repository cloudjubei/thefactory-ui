import { describe, expect, it, vi } from 'vitest'
import {
  type ComposerReviewRun,
  answerDecisionCardWithNote,
  composerAnswerNote,
  composerMessageRoute,
  reviewDecisionNoteMetadata,
  reviewGateNoteAnswer,
} from './composerAnswer'
import { COMPOSER_ANSWER_TEXT } from './composerAnswerConstants'

const decision = { id: 'g1', toolName: 'askColleagueReviewDecision', args: { reply: 'Hi' } }
const cliDecision = { id: 'g2', toolName: 'mcp__overseer__askColleagueReviewDecision' }
const other = { id: 'g3', toolName: 'writeFile' }

const gateRun = (over: Record<string, unknown> = {}): ComposerReviewRun =>
  ({
    id: 'run-1',
    ticketReview: { groupId: 'g', ticketKey: 'ZNR-756', round: 2 },
    park: { reason: 'gate' as const, stepId: 'approval' },
    plan: { steps: [{ id: 'approval', kind: 'gate' as const, gateKind: 'actions' as const }] },
    ...over,
  }) as unknown as ComposerReviewRun

describe('composerMessageRoute', () => {
  it('sends the message as ever when nothing waits on the person', () => {
    expect(composerMessageRoute([other])).toEqual({ kind: 'send' })
    expect(composerMessageRoute(undefined)).toEqual({ kind: 'send' })
  })

  it('answers the waiting decision card with the message, under its bare name or a CLI’s', () => {
    expect(composerMessageRoute([other, decision])).toEqual({
      kind: 'decision-note',
      grant: decision,
    })
    expect(composerMessageRoute([cliDecision])).toEqual({
      kind: 'decision-note',
      grant: cliDecision,
    })
  })

  it('answers a review run’s approval with the message when no card waits in the chat', () => {
    expect(composerMessageRoute([other], gateRun())).toEqual({
      kind: 'run-gate-note',
      runId: 'run-1',
    })
    expect(composerMessageRoute([decision], gateRun())).toEqual({
      kind: 'decision-note',
      grant: decision,
    })
  })

  it('sends as ever while the run is not at its approval, or is no review', () => {
    expect(composerMessageRoute([], gateRun({ park: undefined }))).toEqual({ kind: 'send' })
    expect(
      composerMessageRoute([], gateRun({ park: { reason: 'step-waiting', stepId: 'approval' } })),
    ).toEqual({ kind: 'send' })
    expect(composerMessageRoute([], gateRun({ ticketReview: undefined }))).toEqual({ kind: 'send' })
  })
})

describe('composerAnswerNote', () => {
  it('is the message, its files named after it', () => {
    expect(composerAnswerNote('  resolved manually  ', [])).toBe('resolved manually')
    expect(composerAnswerNote('see this', ['chat-files/a.png', 'chat-files/b.log'])).toBe(
      'see this\n\nFiles: chat-files/a.png, chat-files/b.log',
    )
    expect(composerAnswerNote('', ['chat-files/a.png'])).toBe('Files: chat-files/a.png')
  })
})

describe('reviewDecisionNoteMetadata', () => {
  it('answers the card with the note as its choice', () => {
    expect(reviewDecisionNoteMetadata('I’ve resolved this one manually')).toEqual({
      args: { choice: 'note', note: 'I’ve resolved this one manually' },
    })
  })
})

describe('reviewGateNoteAnswer', () => {
  it('sends the round back with the note, as Keep reviewing does', () => {
    expect(reviewGateNoteAnswer('please also mention X')).toEqual({
      choice: 'request-changes',
      note: 'please also mention X',
    })
  })
})

describe('COMPOSER_ANSWER_TEXT', () => {
  it('names what the card folds to once answered from the composer', () => {
    expect(COMPOSER_ANSWER_TEXT.noteSent.text).toBe('Your message went to the card')
    expect(COMPOSER_ANSWER_TEXT.noteSent.tone).toBe('done')
  })
})

describe('answerDecisionCardWithNote', () => {
  it('approves the card’s call once with the note as its answer', async () => {
    const decide = vi.fn(async () => undefined)
    expect(await answerDecisionCardWithNote({ decide }, 'resolved manually')).toBe(true)
    expect(decide).toHaveBeenCalledWith('once', {
      args: { choice: 'note', note: 'resolved manually' },
    })
  })

  it('answers false when the card would not take it, so the message is handed back', async () => {
    const decide = vi.fn(async () => {
      throw new Error('gone')
    })
    expect(await answerDecisionCardWithNote({ decide }, 'x')).toBe(false)
  })
})
