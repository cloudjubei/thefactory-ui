import type { InkChannel } from './inkBadgeTypes'

/** WS topic announcing a ticket connection's new-item counts changed. */
export const CONNECTOR_NEW_ITEMS_EVENT = 'connectors:new-items'

/** The badge colour new tickets take: the person's colour for requests. */
export const CONNECTOR_NEW_ITEMS_CHANNEL: InkChannel = 'cross-project'
