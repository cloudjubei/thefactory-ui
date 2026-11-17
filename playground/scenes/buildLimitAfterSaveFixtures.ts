import { SERVE_BUILD_LIMIT_MINUTE_MS } from 'thefactory-ui/headless'

/**
 * What the build-limit field shows once Save has returned and the list may
 * echo the saved minutes. The panel is drawn from the field the hook returns
 * at that moment. Nothing here moves on a timer.
 *
 * Web, no login:
 * - /?scene=build-limit-after-save&state=typed-after-save — stored 45 minutes
 *   (2700000) and 60 typed. Save is available. Saved is absent.
 * - &state=echoed — stored 45 minutes and nothing newer typed. The field shows
 *   45 and Saved.
 *
 * Native: ?view=build-limit-after-save&state=typed-after-save|echoed
 *
 * The hook itself is not mounted: it shows nothing until a project is in the
 * list, and that list loads only when there is a token. A fresh mount also
 * starts with nothing typed and Saved off, so it cannot draw these two moments.
 */
export const BUILD_LIMIT_STORED_MS = 45 * SERVE_BUILD_LIMIT_MINUTE_MS

export const BUILD_LIMIT_AFTER_SAVE_STATES = {
  'typed-after-save': { storedMs: BUILD_LIMIT_STORED_MS, typed: '60', saved: false },
  echoed: { storedMs: BUILD_LIMIT_STORED_MS, typed: undefined, saved: true },
} as const
