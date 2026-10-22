import { isOpenChangesCardOnlyMessage } from './openChangesNotice'

/** The only shape deciding whether a client draws a message needs. */
export type DrawableMessage = { role: string; openChangesCard?: unknown; cliRunId?: string }

/**
 * The chat's messages a client draws, in order: a message no client draws
 * ({@link isOpenChangesCardOnlyMessage}) is left out, so it never takes the
 * place of the last message — the one the person retries, restarts or deletes.
 * Shared by the web and native message lists. The same list when every message
 * is drawn. Pure.
 */
export function chatShownMessages<M extends DrawableMessage>(messages: readonly M[]): M[] {
  return messages.some(isOpenChangesCardOnlyMessage)
    ? messages.filter((m) => !isOpenChangesCardOnlyMessage(m))
    : (messages as M[])
}

/**
 * The messages up to the last one a client draws: trailing messages no client
 * draws are read past. PAIRED with `withoutUndrawnTail` in thefactory-tools
 * (`src/completion/completionUtils.ts`), which the store's delete and restart
 * read the chat through. The same list when it ends on a drawn message. Pure.
 */
export function withoutUndrawnTail<M extends DrawableMessage>(
  messages: readonly M[],
): readonly M[] {
  let end = messages.length
  while (end > 0 && isOpenChangesCardOnlyMessage(messages[end - 1]!)) end--
  return end === messages.length ? messages : messages.slice(0, end)
}
