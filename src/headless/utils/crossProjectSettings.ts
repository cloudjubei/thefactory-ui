import {
  DEFAULT_CROSS_PROJECT_ACCEPTANCE,
  FEATURE_REQUEST_ACCEPTANCE_MODES,
} from 'thefactory-tools/constants'
import type { FeatureRequestAcceptance } from 'thefactory-tools/types'

/** Type guard for a receiver acceptance mode (`off` | `manual` | `autonomous`). */
export function isAcceptanceMode(value: unknown): value is FeatureRequestAcceptance {
  return (
    typeof value === 'string' &&
    (FEATURE_REQUEST_ACCEPTANCE_MODES as readonly string[]).includes(value)
  )
}

/** Extract a valid acceptance mode from a layered app-settings record's content, or `undefined`. */
export function readAcceptanceLayer(content: unknown): FeatureRequestAcceptance | undefined {
  const mode = (content as { mode?: unknown } | undefined)?.mode
  return isAcceptanceMode(mode) ? mode : undefined
}

/**
 * Resolve a project's effective receiver acceptance: **per-project override ?? user-global default ??
 * {@link DEFAULT_CROSS_PROJECT_ACCEPTANCE}** — the same `app ?? global ?? inferred` order the backend
 * resolver uses. A malformed/unknown mode in either layer is ignored (falls through), so a corrupt
 * setting never widens a project's real policy.
 */
export function resolveAcceptance(
  appContent: unknown,
  globalContent: unknown,
): FeatureRequestAcceptance {
  return (
    readAcceptanceLayer(appContent) ??
    readAcceptanceLayer(globalContent) ??
    DEFAULT_CROSS_PROJECT_ACCEPTANCE
  )
}
