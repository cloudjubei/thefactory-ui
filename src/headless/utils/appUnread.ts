import { APP_UNREAD_TYPE } from 'thefactory-tools/constants'

/**
 * The project whose app's unread items a `data:updated` event changed, or
 * `undefined` for any other event. Pure.
 */
export function appUnreadChangeScope(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const { type, scope } = payload as { type?: unknown; scope?: unknown }
  return type === APP_UNREAD_TYPE && typeof scope === 'string' && scope ? scope : undefined
}

/** The projects that have an app, by id — those whose App tab can hold unread items. Pure. */
export function appProjectIds(
  projects: ReadonlyArray<{ id: string; metadata?: unknown }>,
): string[] {
  return projects
    .filter((p) => (p.metadata as { hasApp?: unknown } | undefined)?.hasApp === true)
    .map((p) => p.id)
}
