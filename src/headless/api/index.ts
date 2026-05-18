// Backend client surface shared by web, desktop, and mobile consumers of
// `thefactory-backend`. SDK-independent today — the generated hey-api client
// + the helpers that lean on its types (`isTestRun`, `isCoverage`,
// `isGrepHit`, `LastTestsRunRaw`, …) lift here once codegen relocates.

export {
  WsClient,
  type WsClientOptions,
  type WsConnectionState,
  type WsEventHandler,
} from './WsClient'

export { extractErrorMessage } from './errorMessage'

export {
  extractServerError,
  getResponseDataMessage,
  unwrapGitEnvelope,
  type ServerError,
} from './helpers'
