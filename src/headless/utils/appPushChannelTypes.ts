import type { BridgeRequest } from './appBridge'

export type AppPushListener = (message: BridgeRequest) => void
