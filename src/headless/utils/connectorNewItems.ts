import type { ExternalItem } from '../api/generated'
import { CONNECTOR_NEW_ITEMS_CHANNEL } from './connectorNewItemsConstants'
import type { ConnectorItemIdentity, ConnectorNewItems } from './connectorNewItemsTypes'
import type { NavRowIndicator } from './navIndicatorTypes'

const tickets = (n: number) => `${n} ${n === 1 ? 'ticket' : 'tickets'}`

/**
 * The Import tickets badge: a number for tickets definitely not shown before,
 * a dot when some only may be new. A ticket that may be new is never part of
 * the number. Pure.
 */
export function connectorNewItemsIndicator(counts: ConnectorNewItems | undefined): NavRowIndicator {
  if (!counts) return { kind: 'none' }
  const { newCount, uncertainCount } = counts
  if (newCount > 0) {
    const maybe = uncertainCount > 0 ? ` · ${uncertainCount} may be new` : ''
    return {
      kind: 'ink',
      badge: { parts: [{ channel: CONNECTOR_NEW_ITEMS_CHANNEL, count: newCount }], rollup: false },
      title: `${newCount} new ${newCount === 1 ? 'ticket' : 'tickets'}${maybe}`,
    }
  }
  if (uncertainCount > 0) return { kind: 'dot', title: `${tickets(uncertainCount)} may be new` }
  return { kind: 'none' }
}

/** What of each listed item marks it seen, exactly as the listing gave it. Pure. */
export function connectorShownItems(items: readonly ExternalItem[]): ConnectorItemIdentity[] {
  return items.map((item) => ({
    provider: item.provider,
    externalId: item.externalId,
    ...(item.sourceTenant !== undefined ? { sourceTenant: item.sourceTenant } : {}),
    ...(item.sourceItemId !== undefined ? { sourceItemId: item.sourceItemId } : {}),
  }))
}

/** Counts keyed by connection. Pure. */
export function connectorNewItemsById(
  list: readonly ConnectorNewItems[],
): Record<string, ConnectorNewItems> {
  return Object.fromEntries(list.map((counts) => [counts.connectionId, counts]))
}

/** `byId` with one connection's counts replaced. Pure. */
export function withConnectorNewItems(
  byId: Readonly<Record<string, ConnectorNewItems>>,
  counts: ConnectorNewItems,
): Record<string, ConnectorNewItems> {
  return { ...byId, [counts.connectionId]: counts }
}
