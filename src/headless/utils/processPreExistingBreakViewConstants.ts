/** The words of a stop on a check target already broken before the change. */
export const PRE_EXISTING_BREAK_COPY = {
  headline: 'Already broken before this change',
  base: (at: string): string => `Fails the same way on ${at}, in files this change does not touch.`,
  files: 'Files',
  checks: 'Checks',
  failing: 'What fails',
} as const

/** How many characters of a base commit name it. */
export const PRE_EXISTING_BREAK_SHA_LENGTH = 7
