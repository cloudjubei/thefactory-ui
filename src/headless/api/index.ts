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

// Chat archival — hand-written until the route lands in the generated SDK.

// Process-singleton cache + lookup helpers for backend pricing snapshots.
// Single source of truth for chat usage modals, model chips, and the
// pricing settings panel across web / desktop / mobile.
export {
  getCachedPricing,
  setCachedPricing,
  isPricingStale,
  getPricingState,
  refreshPricingState,
  getPrice,
} from './pricingService'
