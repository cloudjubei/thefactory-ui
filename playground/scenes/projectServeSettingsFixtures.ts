import { SERVE_BUILD_LIMIT_COPY, SERVE_BUILD_LIMIT_MINUTE_MS } from 'thefactory-ui/headless'

/**
 * What each serve-settings screen shows once it has settled. Nothing here moves on a timer.
 *
 * Web, no login:
 * - /?scene=project-serve-settings&state=default — Build limit empty, placeholder 30, hint that
 *   blank uses 30 minutes. Save is not available.
 * - &state=edited — 45 is typed and Save is available.
 * - &state=saved — 45 is kept and the line says Saved. Save is not available.
 * - &state=invalid — 0, with "Enter a number of minutes above 0." Save is not available.
 * - &state=save-failed — 45, with "Could not save the build limit. Try again."
 *
 * Native: ?view=project-serve-settings&state=default|edited|saved|invalid|save-failed
 */
export type ServeBuildLimitSceneState = {
  storedMs?: number
  typed?: string
  saved?: boolean
  saving?: boolean
  saveError?: string
}

export const SERVE_BUILD_LIMIT_SCENE_STATES: Record<string, ServeBuildLimitSceneState> = {
  default: {},
  edited: { typed: '45' },
  saved: { storedMs: 45 * SERVE_BUILD_LIMIT_MINUTE_MS, saved: true },
  invalid: { typed: '0' },
  'save-failed': { typed: '45', saveError: SERVE_BUILD_LIMIT_COPY.saveFailed },
}
