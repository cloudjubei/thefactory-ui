import { describe, it, expect } from 'vitest'
import {
  shownQuestionId,
  answerDecision,
  answeredQuestionOf,
  splitParkedAsks,
  canSubmitAnswer,
  declineDecision,
  isQuestionAction,
  isQuestionGrant,
  parseQuestionPayload,
  partitionGrants,
  userAsks,
} from './agentQuestions'
import { QUESTION_DECLINED_ANSWER, QUESTION_FALLBACK_PROMPT } from './agentQuestionConstants'
import type { PendingQuestionGrant, PendingToolGrant, UserAsk } from './chatTypes'
import type { CredentialCapture } from './credentialCaptureTypes'

const noop = async () => {}

function grant(overrides: Partial<PendingToolGrant>): PendingToolGrant {
  return { id: 'g', chatRunner: 'cli', label: 'Question', decide: noop, ...overrides }
}

describe('isQuestionAction', () => {
  it('matches the question kind only', () => {
    expect(isQuestionAction({ id: 'a', kind: 'question' })).toBe(true)
    expect(isQuestionAction({ id: 'b', kind: 'network-unlock' })).toBe(false)
    expect(isQuestionAction({ id: 'c', kind: 'Question' })).toBe(false)
  })
})

describe('isQuestionAction — a reported blocker', () => {
  it('takes the question card, answered with words', () => {
    expect(isQuestionAction({ kind: 'blocker' } as never)).toBe(true)
  })
})

describe('parseQuestionPayload — a reported blocker', () => {
  it('asks what the agent needs, with what it tried as the background', () => {
    expect(
      parseQuestionPayload({
        blocker: 'The emulator will not boot.',
        tried: 'Cold boot twice.',
        needFromPerson: 'Restart it on the host.',
      }),
    ).toEqual({
      question: 'The emulator will not boot.\n\nWhat it needs from you: Restart it on the host.',
      context: 'What it tried: Cold boot twice.',
    })
  })
})

describe('parseQuestionPayload', () => {
  it('reads question, context and rich options from a well-formed payload', () => {
    expect(
      parseQuestionPayload({
        question: 'Which database should I target?',
        context: 'Both are configured in .env',
        options: [
          { label: 'postgres', detail: 'The server', recommended: true },
          { label: 'sqlite' },
        ],
      }),
    ).toEqual({
      question: 'Which database should I target?',
      context: 'Both are configured in .env',
      options: [
        { label: 'postgres', detail: 'The server', recommended: true },
        { label: 'sqlite' },
      ],
    })
  })

  it('reads the kind of answer the agent wants, so the card can offer a picker', () => {
    expect(parseQuestionPayload({ question: 'Which branch?', answerKind: 'branch' })).toEqual({
      question: 'Which branch?',
      answerKind: 'branch',
    })
  })

  it('ignores an answer kind it does not know, and plain text', () => {
    expect(parseQuestionPayload({ question: 'Q', answerKind: 'colour' })).toEqual({ question: 'Q' })
    expect(parseQuestionPayload({ question: 'Q', answerKind: 'text' })).toEqual({ question: 'Q' })
  })

  it('marks at most one option as the agent’s pick — the first so marked', () => {
    expect(
      parseQuestionPayload({
        question: 'Q',
        options: [
          { label: 'a', recommended: true },
          { label: 'b', recommended: true },
        ],
      }).options,
    ).toEqual([{ label: 'a', recommended: true }, { label: 'b' }])
  })

  it('omits context and options when absent', () => {
    expect(parseQuestionPayload({ question: 'Ready?' })).toEqual({ question: 'Ready?' })
  })

  it('trims text fields and drops whitespace-only ones', () => {
    expect(parseQuestionPayload({ question: '  Ready?  ', context: '   ' })).toEqual({
      question: 'Ready?',
    })
  })

  it('treats a bare string payload as the question', () => {
    expect(parseQuestionPayload('  Which branch?  ')).toEqual({ question: 'Which branch?' })
  })

  it('keeps only options with a label, trimmed and de-duplicated in order', () => {
    expect(
      parseQuestionPayload({
        question: 'Pick one',
        options: [
          { label: 'a' },
          3,
          { label: '  b  ', detail: '   ' },
          { label: '' },
          null,
          { label: 'a', detail: 'again' },
          {},
          'c',
        ],
      }),
    ).toEqual({ question: 'Pick one', options: [{ label: 'a' }, { label: 'b' }] })
  })

  it('omits options when none survive filtering', () => {
    expect(parseQuestionPayload({ question: 'Pick one', options: [1, '', null] })).toEqual({
      question: 'Pick one',
    })
  })

  it('omits options when the field is not an array', () => {
    expect(parseQuestionPayload({ question: 'Pick one', options: 'a,b' })).toEqual({
      question: 'Pick one',
    })
  })

  it('falls back to the generic prompt and keeps the raw payload when there is no question text', () => {
    expect(parseQuestionPayload({ ask: 'oops', context: 'why' })).toEqual({
      question: QUESTION_FALLBACK_PROMPT,
      context: 'why',
      raw: { ask: 'oops', context: 'why' },
    })
  })

  it('does not crash on null, undefined, arrays or primitives', () => {
    expect(parseQuestionPayload(null)).toEqual({ question: QUESTION_FALLBACK_PROMPT, raw: null })
    expect(parseQuestionPayload(undefined)).toEqual({
      question: QUESTION_FALLBACK_PROMPT,
      raw: undefined,
    })
    expect(parseQuestionPayload(['a'])).toEqual({ question: QUESTION_FALLBACK_PROMPT, raw: ['a'] })
    expect(parseQuestionPayload(42)).toEqual({ question: QUESTION_FALLBACK_PROMPT, raw: 42 })
    expect(parseQuestionPayload('   ')).toEqual({ question: QUESTION_FALLBACK_PROMPT, raw: '   ' })
  })

  it('does not set raw when the question parsed cleanly', () => {
    expect('raw' in parseQuestionPayload({ question: 'Ready?' })).toBe(false)
  })
})

describe('canSubmitAnswer', () => {
  it('requires at least one non-whitespace character', () => {
    expect(canSubmitAnswer('yes')).toBe(true)
    expect(canSubmitAnswer('  y  ')).toBe(true)
    expect(canSubmitAnswer('')).toBe(false)
    expect(canSubmitAnswer('   \n\t ')).toBe(false)
  })
})

describe('answerDecision', () => {
  it('approves the action and carries the trimmed answer in metadata', () => {
    expect(answerDecision('  use postgres  ')).toEqual({
      outcome: 'approved',
      decidedVia: 'card',
      metadata: { answer: 'use postgres' },
    })
  })

  it('carries the files handed over with the answer, and no list without any', () => {
    expect(answerDecision('see the log', ['logs/run.txt']).metadata).toEqual({
      answer: 'see the log',
      files: ['logs/run.txt'],
    })
    expect(answerDecision('no files', []).metadata).toEqual({ answer: 'no files' })
  })
})

describe('declineDecision', () => {
  it('denies the action and tells the agent to use its best judgement', () => {
    expect(declineDecision()).toEqual({
      outcome: 'denied',
      decidedVia: 'card',
      metadata: { answer: QUESTION_DECLINED_ANSWER },
    })
  })
})

describe('isQuestionGrant', () => {
  it('requires both a parsed question and an answer channel', () => {
    expect(isQuestionGrant(grant({ question: { question: 'Q' }, answer: noop }))).toBe(true)
    expect(isQuestionGrant(grant({ question: { question: 'Q' } }))).toBe(false)
    expect(isQuestionGrant(grant({ answer: noop }))).toBe(false)
    expect(isQuestionGrant(grant({}))).toBe(false)
  })
})

describe('partitionGrants', () => {
  it('splits question grants from permission grants, preserving order', () => {
    const q1 = grant({ id: 'q1', question: { question: 'A' }, answer: noop })
    const p1 = grant({ id: 'p1', label: 'Network unlock' })
    const q2 = grant({ id: 'q2', question: { question: 'B' }, answer: noop })
    const p2 = grant({ id: 'p2', chatRunner: 'api', label: 'writeFile' })

    expect(partitionGrants([q1, p1, q2, p2])).toEqual({
      questions: [q1, q2],
      // Remedy grants are their own lane (they render a RemedyCard, not a
      // permission row); none here, but the key is part of the shape.
      remedies: [],
      permissions: [p1, p2],
    })
  })

  it('returns empty lists for an empty or missing feed', () => {
    expect(partitionGrants([])).toEqual({ questions: [], remedies: [], permissions: [] })
    expect(partitionGrants(undefined)).toEqual({
      questions: [],
      remedies: [],
      permissions: [],
    })
  })
})

describe('shownQuestionId', () => {
  it('shows the first question when none was chosen', () => {
    expect(shownQuestionId(['q1', 'q2'], undefined)).toBe('q1')
  })

  it('keeps the chosen question while it is still open, wherever it moved', () => {
    expect(shownQuestionId(['q0', 'q1', 'q2'], 'q2')).toBe('q2')
  })

  it('moves to the first open question once the chosen one is answered', () => {
    expect(shownQuestionId(['q2'], 'q1')).toBe('q2')
  })

  it('shows nothing when no question is open', () => {
    expect(shownQuestionId([], 'q1')).toBeUndefined()
  })
})

describe('userAsks', () => {
  const question = (id: string) =>
    ({
      ...grant({ id }),
      question: { question: 'Which one?' },
      answer: noop,
    }) as PendingQuestionGrant
  const form = (
    id: string,
    status: CredentialCapture['status'] = 'requested',
  ): CredentialCapture => ({
    id,
    purpose: 'Connect Jira',
    provider: 'ticket-connection',
    status,
    requestedAt: '2026-10-05T10:00:00.000Z',
  })

  it('puts open questions and open credential forms in one list, questions first', () => {
    expect(userAsks([question('q1')], [form('c1')])).toEqual([
      { kind: 'question', id: 'q1', grant: question('q1') },
      { kind: 'capture', id: 'c1', capture: form('c1') },
    ])
  })

  it('leaves out a form the user already answered or dismissed', () => {
    expect(userAsks([], [form('c1', 'submitted'), form('c2', 'cancelled')])).toEqual([])
  })

  it('is empty when nothing waits on the user', () => {
    expect(userAsks([], [])).toEqual([])
  })
})

describe('answeredQuestionOf', () => {
  const asked = { question: 'Which branch?', options: [{ label: 'dev' }] }

  it('folds an answered askUser row to its question and answer', () => {
    expect(
      answeredQuestionOf({
        toolName: 'askUser',
        args: asked,
        result: { answer: 'dev' },
        resultType: 'success',
      }),
    ).toEqual({ question: 'Which branch?', answer: 'dev', by: 'answered' })
  })

  it('reads the answer the decision recorded when the row carries none', () => {
    expect(
      answeredQuestionOf({
        toolName: 'mcp__thefactory__askUser',
        args: asked,
        result: 'The user answered your question',
        resultType: 'success',
        decided: { status: 'approved', answer: 'main' },
      }),
    ).toEqual({ question: 'Which branch?', answer: 'main', by: 'answered' })
  })

  it('says the agent was left to decide when the question was declined', () => {
    expect(
      answeredQuestionOf({
        toolName: 'askUser',
        args: asked,
        resultType: 'not_allowed',
        decided: { status: 'denied' },
      }),
    ).toEqual({ question: 'Which branch?', by: 'agent-decides' })
    expect(
      answeredQuestionOf({
        toolName: 'askUser',
        args: asked,
        result: { outcome: 'denied' },
        resultType: 'not_allowed',
      }),
    ).toEqual({ question: 'Which branch?', by: 'agent-decides' })
  })

  it('leaves a question still waiting, expired or withdrawn as its row', () => {
    expect(
      answeredQuestionOf({ toolName: 'askUser', args: asked, resultType: 'require_confirmation' }),
    ).toBeUndefined()
    expect(
      answeredQuestionOf({
        toolName: 'askUser',
        args: asked,
        resultType: 'not_allowed',
        decided: { status: 'expired' },
      }),
    ).toBeUndefined()
  })

  it('is not about any other tool, nor a call with no question', () => {
    expect(
      answeredQuestionOf({ toolName: 'readPaths', args: asked, result: { answer: 'x' } }),
    ).toBeUndefined()
    expect(
      answeredQuestionOf({ toolName: 'askUser', args: {}, result: { answer: 'x' } }),
    ).toBeUndefined()
  })
})

describe('splitParkedAsks', () => {
  const ask = (id: string): UserAsk => ({ kind: 'capture', id, capture: {} as CredentialCapture })

  it('keeps the asks set aside apart from the open ones, each in order', () => {
    expect(splitParkedAsks([ask('a'), ask('b'), ask('c')], new Set(['b']))).toEqual({
      open: [ask('a'), ask('c')],
      parked: [ask('b')],
    })
  })

  it('has every ask open when none is set aside', () => {
    expect(splitParkedAsks([ask('a')], new Set())).toEqual({ open: [ask('a')], parked: [] })
  })
})
