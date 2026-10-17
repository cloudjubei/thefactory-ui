/** Copy for the card of the questions a paused run waits on. */
export const OPEN_QUESTIONS_COPY = {
  title: (n: number) => (n === 1 ? 'The agent has a question' : `The agent has ${n} questions`),
  answered: 'All answered.',
  loading: 'Reading the questions…',
  on: (featureTitle: string) => `on ${featureTitle}`,
  placeholder: 'Your answer — this unblocks the feature',
  answer: 'Answer',
  sending: 'Sending…',
  failed: 'That answer was not saved. Try again.',
}
