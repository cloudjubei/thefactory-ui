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
 *
 * A `'blocker'` entry is NOT one of these. It records why a run stopped, which
 * the feature's status and rejection already say, and nobody can answer it —
 * shown here it put "CLI agent run ended with errored" on screen under "The
 * agent has a question", with a reply box beneath it, holding up sign-off.
 * An entry with no `kind` predates the distinction and is read as a question,
 * which is the safe direction: a real question stays visible.
 */
export function openFeatureQuestions(features: readonly Feature[]): OpenFeatureQuestion[] {
  const open: OpenFeatureQuestion[] = []
  for (const feature of features) {
    for (const q of feature.questions ?? []) {
      if (q.answer !== undefined) continue
      if (q.kind === 'blocker') continue
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
