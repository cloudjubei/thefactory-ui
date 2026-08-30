import { describe, it, expect } from 'vitest'
import {
  answerDecision,
  canSubmitAnswer,
  declineDecision,
  isQuestionAction,
  isQuestionGrant,
  parseQuestionPayload,
  partitionGrants,
} from './agentQuestions'
import { QUESTION_DECLINED_ANSWER, QUESTION_FALLBACK_PROMPT } from './agentQuestionConstants'
import type { PendingToolGrant } from './chatTypes'

const noop = async () => {}

function grant(overrides: Partial<PendingToolGrant>): PendingToolGrant {
  return { id: 'g', source: 'cli', label: 'Question', decide: noop, ...overrides }
}

describe('isQuestionAction', () => {
  it('matches the question kind only', () => {
    expect(isQuestionAction({ id: 'a', kind: 'question' })).toBe(true)
    expect(isQuestionAction({ id: 'b', kind: 'network-unlock' })).toBe(false)
    expect(isQuestionAction({ id: 'c', kind: 'Question' })).toBe(false)
  })
})

describe('parseQuestionPayload', () => {
  it('reads question, context and options from a well-formed payload', () => {
    expect(
      parseQuestionPayload({
        question: 'Which database should I target?',
        context: 'Both are configured in .env',
        options: ['postgres', 'sqlite'],
      }),
    ).toEqual({
      question: 'Which database should I target?',
      context: 'Both are configured in .env',
      options: ['postgres', 'sqlite'],
    })
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

  it('keeps only non-empty string options, de-duplicated in order', () => {
    expect(
      parseQuestionPayload({
        question: 'Pick one',
        options: ['a', 3, '  b  ', '', null, 'a', {}],
      }),
    ).toEqual({ question: 'Pick one', options: ['a', 'b'] })
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
      metadata: { answer: 'use postgres' },
    })
  })
})

describe('declineDecision', () => {
  it('denies the action and tells the agent to use its best judgement', () => {
    expect(declineDecision()).toEqual({
      outcome: 'denied',
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
    const p2 = grant({ id: 'p2', source: 'api', label: 'writeFile' })

    expect(partitionGrants([q1, p1, q2, p2])).toEqual({
      questions: [q1, q2],
      permissions: [p1, p2],
    })
  })

  it('returns empty lists for an empty or missing feed', () => {
    expect(partitionGrants([])).toEqual({ questions: [], permissions: [] })
    expect(partitionGrants(undefined)).toEqual({ questions: [], permissions: [] })
  })
})
