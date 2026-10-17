import { describe, expect, it } from 'vitest'

import type { Feature } from '../api/generated'
import { openQuestionsCardView } from './openQuestionsCard'
import { OPEN_QUESTIONS_COPY } from './openQuestionsCardConstants'

const feature = (id: string, questions: unknown[]) =>
  ({ id, title: `Feature ${id}`, questions }) as unknown as Feature
const question = (id: string, askedAt: string, extra: Record<string, unknown> = {}) => ({
  id,
  question: `q-${id}`,
  askedAt,
  ...extra,
})

describe('openQuestionsCardView', () => {
  it('lists the open questions of the run’s features, oldest first', () => {
    const view = openQuestionsCardView(
      [feature('f1', [question('a', '2026-10-02')]), feature('f2', [question('b', '2026-10-01')])],
      {},
    )
    expect(view).toEqual({
      state: 'open',
      title: OPEN_QUESTIONS_COPY.title(2),
      questions: [
        {
          featureId: 'f2',
          featureTitle: 'Feature f2',
          questionId: 'b',
          question: 'q-b',
          askedAt: '2026-10-01',
        },
        {
          featureId: 'f1',
          featureTitle: 'Feature f1',
          questionId: 'a',
          question: 'q-a',
          askedAt: '2026-10-02',
        },
      ],
    })
  })

  it('counts only the features the run worked', () => {
    const view = openQuestionsCardView(
      [feature('f1', [question('a', '1')]), feature('f2', [question('b', '2')])],
      { featureIds: ['f1'] },
    )
    expect(view.questions.map((q) => q.questionId)).toEqual(['a'])
    expect(view.title).toBe(OPEN_QUESTIONS_COPY.title(1))
  })

  it('says all are answered once none is open — answered here or anywhere else', () => {
    expect(
      openQuestionsCardView([feature('f1', [question('a', '1', { answer: 'yes' })])], {}),
    ).toEqual({ state: 'answered', title: OPEN_QUESTIONS_COPY.answered, questions: [] })
  })

  it('leaves out a blocker, which nobody can answer', () => {
    expect(
      openQuestionsCardView([feature('f1', [question('a', '1', { kind: 'blocker' })])], {}).state,
    ).toBe('answered')
  })

  it('reads as loading until the story is there', () => {
    expect(openQuestionsCardView(undefined, {})).toEqual({
      state: 'loading',
      title: OPEN_QUESTIONS_COPY.loading,
      questions: [],
    })
  })
})

describe('OPEN_QUESTIONS_COPY', () => {
  it('names one question and many', () => {
    expect(OPEN_QUESTIONS_COPY.title(1)).toBe('The agent has a question')
    expect(OPEN_QUESTIONS_COPY.title(3)).toBe('The agent has 3 questions')
    expect(OPEN_QUESTIONS_COPY.on('Login')).toBe('on Login')
  })
})
