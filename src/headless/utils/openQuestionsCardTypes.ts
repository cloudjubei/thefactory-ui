import type { OpenFeatureQuestion } from './featureQuestions'

/** The card of the questions a paused run waits on, as it reads now. */
export type OpenQuestionsCardView =
  | { state: 'loading'; title: string; questions: [] }
  | { state: 'open'; title: string; questions: OpenFeatureQuestion[] }
  | { state: 'answered'; title: string; questions: [] }
