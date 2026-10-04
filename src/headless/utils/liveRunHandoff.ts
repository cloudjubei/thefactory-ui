/**
 * The CLI run a chat shows as in flight. A run that just ended stays shown
 * until a persisted message carries it: the server stops listing it as running
 * before the chat's own copy of the reply arrives, and in between the reply —
 * and the asks on its rows — had nowhere to show.
 */
export function liveRunToShow(input: {
  live: string | undefined
  held: string | undefined
  persistedRunIds: ReadonlySet<string>
}): string | undefined {
  if (input.live !== undefined) return input.live
  if (input.held !== undefined && !input.persistedRunIds.has(input.held)) return input.held
  return undefined
}
