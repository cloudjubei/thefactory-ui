// Backend client surface shared by web, desktop, and mobile consumers of
// `thefactory-backend`. The generated hey-api client, SDK-typed helpers,
// transport, and React-side providers all live here.

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
  isCoverage,
  isGitCredentialError,
  isGrepHit,
  isTestRun,
  unwrapGitEnvelope,
  type ServerError,
} from './helpers'

export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthProviderProps,
  type TokenStorage,
} from './AuthContext'

export {
  ApiProvider,
  useApi,
  type ApiContextValue,
  type ApiProviderProps,
  type ConfigureBackendClientOptions,
} from './ApiContext'

// Generated SDK (calls + types) + the hey-api bootstrap that wires it to
// the active token + 401 callbacks. Friendly aliases over the generated
// shapes live in `./sdkTypes`.
export { configureBackendClient } from './bootstrap'
export * from './generated'
export * from './sdkTypes'
