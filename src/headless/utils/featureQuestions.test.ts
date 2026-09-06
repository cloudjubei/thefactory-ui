import { describe, expect, it } from 'vitest'
import { openFeatureQuestions } from './featureQuestions'
import type { Feature } from '../api/generated'

const feat = (id: string, questions: unknown[]): Feature =>
  ({ id, title: `F ${id}`, questions }) as unknown as Feature

describe('openFeatureQuestions', () => {
  it('collects unanswered questions across features, oldest first', () => {
    const open = openFeatureQuestions([
      feat('f2', [{ id: 'q2', question: 'later?', askedAt: '2026-01-02T00:00:00Z' }]),
      feat('f1', [{ id: 'q1', question: 'earlier?', askedAt: '2026-01-01T00:00:00Z' }]),
    ])
    expect(open.map((q) => q.questionId)).toEqual(['q1', 'q2'])
    expect(open[0]?.featureId).toBe('f1')
    expect(open[0]?.featureTitle).toBe('F f1')
  })

  it('omits questions that already have an answer', () => {
    const open = openFeatureQuestions([
      feat('f1', [
        { id: 'q1', question: 'done?', askedAt: '2026-01-01T00:00:00Z', answer: 'yes' },
        { id: 'q2', question: 'open?', askedAt: '2026-01-02T00:00:00Z' },
      ]),
    ])
    expect(open.map((q) => q.questionId)).toEqual(['q2'])
  })

  it('treats an EMPTY-STRING answer as answered, not as still open', () => {
    // Otherwise a deliberate "no comment" reply loops the question forever.
    const open = openFeatureQuestions([
      feat('f1', [{ id: 'q1', question: 'x?', askedAt: '2026-01-01T00:00:00Z', answer: '' }]),
    ])
    expect(open).toEqual([])
  })

  it('is empty for features with no questions at all', () => {
    expect(openFeatureQuestions([feat('f1', []), { id: 'f2' } as unknown as Feature])).toEqual([])
  })
})
