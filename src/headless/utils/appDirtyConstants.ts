import { BRIDGE_PREFIX } from './appBridge'

export const APP_DIRTY_MESSAGE = 'app.dirty'

export const APP_DIRTY_TYPE = `${BRIDGE_PREFIX}${APP_DIRTY_MESSAGE}`

export const APP_DIRTY_DEFAULT_MESSAGE = 'This app has unsaved changes. Leave anyway?'
