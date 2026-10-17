import { featuresInRunScope } from 'thefactory-tools/utils'

import type { ChatOpenQuestionsCard, Feature } from '../api/generated'
import { openFeatureQuestions } from './featureQuestions'
import { OPEN_QUESTIONS_COPY } from './openQuestionsCardConstants'
import type { OpenQuestionsCardView } from './openQuestionsCardTypes'

/**
 * The questions a paused run waits on, read from the story as it is now — so
 * a question answered anywhere leaves the card at once, and an answered card
 * says so. Only the features the run worked count. Pure.
 */
export function openQuestionsCardView(
  features: readonly Feature[] | undefined,
  card: Pick<ChatOpenQuestionsCard, 'featureIds'>,
): OpenQuestionsCardView {
  if (!features) return { state: 'loading', title: OPEN_QUESTIONS_COPY.loading, questions: [] }
  const questions = openFeatureQuestions(featuresInRunScope(features, card.featureIds))
  return questions.length > 0
    ? { state: 'open', title: OPEN_QUESTIONS_COPY.title(questions.length), questions }
    : { state: 'answered', title: OPEN_QUESTIONS_COPY.answered, questions: [] }
}
