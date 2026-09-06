import type { Feature } from '../api/generated'

/** An unanswered question, carrying the feature it belongs to so it can be answered. */
export type OpenFeatureQuestion = {
  featureId: string
  featureTitle: string
  questionId: string
  question: string
  askedAt: string
}

/**
 * The questions an agent raised and nobody has answered yet, oldest first.
 *
 * This is the whole Q&A surface's input. It exists because a blocked feature
 * previously said only "blocked" somewhere in a story view — the actual question
 * lived in a `rejection` string that no screen asked anyone to answer, so runs
 * stalled silently and the story simply never finished.
 */
export function openFeatureQuestions(features: readonly Feature[]): OpenFeatureQuestion[] {
  const open: OpenFeatureQuestion[] = []
  for (const feature of features) {
    for (const q of feature.questions ?? []) {
      if (q.answer !== undefined) continue
      open.push({
        featureId: feature.id,
        featureTitle: feature.title,
        questionId: q.id,
        question: q.question,
        askedAt: q.askedAt,
      })
    }
  }
  return open.sort((a, b) => a.askedAt.localeCompare(b.askedAt))
}
