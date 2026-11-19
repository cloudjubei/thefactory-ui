/**
 * The recommend result currently identifies launches only by count, not by suggestion or
 * activity id. Never guess which rows succeeded in a partial batch: a second POST can
 * spend compute again. The trainer link remains the way to inspect those activities.
 */
export function trainerRecommendationLaunchNote(
  payload: unknown,
  args: unknown,
): string | undefined {
  const result = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const input = args && typeof args === 'object' ? (args as Record<string, unknown>) : {}
  const launched = typeof result.launched === 'number' ? result.launched : undefined
  if (launched !== undefined && launched > 0) {
    return 'Training already launched for this batch. Open the trainer to see activity status; this result does not identify each activity.'
  }
  if (result.mode === 'launch') {
    if (launched === 0) return undefined
    return 'Launch status is unavailable. Check the trainer before launching again.'
  }
  if (result.mode === 'park' || input.launch === false) return undefined
  return 'Launch status is unavailable. Check the trainer before launching again.'
}
