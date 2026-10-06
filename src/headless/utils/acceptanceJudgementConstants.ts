/** Words too common to tell two criteria apart. */
export const ACCEPTANCE_STOP_WORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'are',
  'its',
  'for',
  'from',
  'with',
  'not',
  'one',
  'any',
  'all',
  'has',
  'have',
  'that',
  'this',
  'into',
  'onto',
  'when',
])

/** The shortest word a criterion is matched on. */
export const ACCEPTANCE_MIN_WORD_LENGTH = 3

/** How much of the shorter criterion's words the other must share to be the same criterion. */
export const ACCEPTANCE_MATCH_MIN_OVERLAP = 0.6

/** What the Delivered line says it rests on. */
export const ACCEPTANCE_PER_REVIEW = 'acceptance criteria, per the code review'
