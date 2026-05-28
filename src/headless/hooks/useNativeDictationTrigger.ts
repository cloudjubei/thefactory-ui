import { createContext, useContext } from 'react'

/**
 * Discriminated result of attempting to invoke the host's native
 * dictation. Both branches drive UI:
 *
 *   - `started` — fire-and-forget success; the OS owns the rest of the
 *     flow (its own mic indicator, its own stop affordance). The app
 *     does NOT show an in-app overlay, because we have no callback
 *     stream to drive one — text lands directly in the focused
 *     textarea via the OS's text input services.
 *   - `unavailable` — the host couldn't start dictation. `reason`
 *     identifies the failure so the UI can map it to actionable copy
 *     (Accessibility permission, OS without native dictation, etc.).
 */
export type NativeDictationResult =
  | { status: 'started' }
  | { status: 'unavailable'; reason: NativeDictationFailureReason | string }

/**
 * Reasons the host can surface verbatim — recognised reasons let the
 * UI render a tailored explanation (and on macOS, a "Open System
 * Settings" button). Anything else passes through to the generic
 * fallback path.
 */
export type NativeDictationFailureReason =
  | 'not-macos'
  | 'ipc-unavailable'
  | 'accessibility-permission'
  | 'dictation-disabled'

/**
 * Host-supplied integration with the OS's built-in dictation feature.
 *
 * Used by desktop / web hosts that DON'T have an in-app
 * speech-to-text engine of their own (the `SpeechToTextEngineContext`
 * path) but DO have an OS-level dictation flow they can trigger —
 * e.g. macOS's "Fn twice" Dictation, which writes transcribed text
 * directly into the focused text input via the OS's text input
 * services.
 *
 * When this context is wired, `ChatInput`'s mic button skips the
 * in-app overlay (waveform, partial transcript surface, Stop button)
 * and simply hands off to `trigger()`. Stopping is the OS's job.
 */
export interface NativeDictationTrigger {
  /** True when the host can dispatch native dictation (e.g. on macOS
   *  desktop with the IPC bridge wired). */
  isSupported(): boolean
  /** Fire the native dictation start sequence. Resolves with the
   *  outcome; the host should not throw on user-facing failures —
   *  surface them via `{ status: 'unavailable' }` so the UI can show
   *  a clear popup. */
  trigger(): Promise<NativeDictationResult>
}

export const NativeDictationTriggerContext = createContext<NativeDictationTrigger | null>(null)

/**
 * Returns the host-supplied native dictation trigger, or `null` when
 * no host has wired one. `null` is the normal case on mobile
 * (`useSpeechToText` is used instead) and on web (no dictation at
 * all).
 */
export function useNativeDictationTrigger(): NativeDictationTrigger | null {
  return useContext(NativeDictationTriggerContext)
}
