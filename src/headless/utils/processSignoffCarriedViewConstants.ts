/** The words of what a sign-off carries beside its build: points to try, and targets left out. */
export const SIGNOFF_CARRIED_COPY = {
  tryTitle: 'Try these',
  tryNote: 'Not shown before the sign-off, so not proven. Try them on the build.',
  shown: (subjects: readonly string[]): string => `Shown: ${subjects.join(', ')}`,
  leftOutTitle: 'Left out of the proof',
  leftOutDetail: (at: string, checks: readonly string[]): string =>
    `Already broken on ${at} · ${checks.join(', ')}`,
} as const
