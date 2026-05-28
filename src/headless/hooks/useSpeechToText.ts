import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * Lifecycle states the mic affordance reads. `unsupported` is the
 * terminal "no engine wired / host platform can't do this" state — the
 * UI hides the mic button entirely. `error` is recoverable: the user
 * can tap again. `requesting-permission` lets the UI show a thinner
 * spinner before the OS permission sheet appears.
 */
export type SpeechToTextStatus =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'error'
  | 'unsupported'

/**
 * Host-supplied speech engine. The hook itself is platform-free —
 * `thefactory-ui` has no `react-native-*` or `webkitSpeechRecognition`
 * dependency. The host (mobile, desktop, web) implements this interface
 * once and provides it via {@link SpeechToTextEngineContext}.
 *
 * `start` returns a `stop` function — the hook calls it when the user
 * taps the mic again or when the component unmounts.
 */
export interface SpeechToTextEngine {
  /**
   * Synchronous capability check. Called once on mount to decide
   * whether the mic button should render at all. Engines that need
   * permission-prompt to determine availability should return `true`
   * here and surface the denial via `onError` after `start`.
   */
  isSupported(): boolean
  start(opts: {
    onPartial(transcript: string): void
    onFinal(transcript: string): void
    onError(error: string): void
    locale?: string
  }): Promise<() => Promise<void> | void>
}

export const SpeechToTextEngineContext = createContext<SpeechToTextEngine | null>(null)

export interface UseSpeechToText {
  status: SpeechToTextStatus
  /** Live in-progress transcript. Cleared on `stop()` / `reset()`. */
  partialTranscript: string
  /** Last finalised utterance — what the host typically appends to the textarea. */
  finalTranscript: string
  error?: string
  isSupported: boolean
  start(opts?: { locale?: string }): Promise<void>
  stop(): Promise<void>
  reset(): void
}

/**
 * Read-and-control hook for the host-supplied speech engine. Renders
 * `unsupported` (with `isSupported: false`) when no engine is provided
 * or the engine reports the platform can't do dictation — hosts use
 * `isSupported` to decide whether to render the mic affordance.
 *
 * The hook is single-instance per consuming component: each
 * `useSpeechToText()` call manages its own engine lifecycle. Two
 * simultaneous instances would race for the OS mic — don't do that.
 */
export function useSpeechToText(): UseSpeechToText {
  const engine = useContext(SpeechToTextEngineContext)
  const supported = engine?.isSupported() ?? false

  const [status, setStatus] = useState<SpeechToTextStatus>(supported ? 'idle' : 'unsupported')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  // The engine returns a stop fn from start(); the most recent one
  // lives in a ref so reset / unmount / repeated start can clear it
  // without re-triggering the effect dependency dance.
  const stopFnRef = useRef<null | (() => Promise<void> | void)>(null)

  useEffect(() => {
    return () => {
      // On unmount, fire-and-forget the stop. The engine implementation
      // is responsible for being idempotent — calling stop() twice or
      // after a failure should be safe.
      const fn = stopFnRef.current
      stopFnRef.current = null
      if (fn) {
        try {
          void fn()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  // Keep status synced with the engine availability — a host can lazily
  // attach an engine and `supported` will flip from false to true.
  useEffect(() => {
    setStatus((prev) => {
      if (!supported) return 'unsupported'
      if (prev === 'unsupported') return 'idle'
      return prev
    })
  }, [supported])

  const start = useCallback(
    async (opts?: { locale?: string }): Promise<void> => {
      if (!engine) return
      if (!engine.isSupported()) {
        setStatus('unsupported')
        return
      }
      // No-op if already capturing — the UI button toggles, so two
      // back-to-back taps means "stop, not start again".
      if (stopFnRef.current) return

      setStatus('requesting-permission')
      setError(undefined)
      setPartialTranscript('')

      try {
        const stopFn = await engine.start({
          locale: opts?.locale,
          onPartial: (transcript) => {
            setPartialTranscript(transcript)
            setStatus((prev) => (prev === 'requesting-permission' ? 'listening' : prev))
          },
          onFinal: (transcript) => {
            setFinalTranscript(transcript)
            setPartialTranscript('')
          },
          onError: (message) => {
            setError(message)
            setStatus('error')
            stopFnRef.current = null
          },
        })
        stopFnRef.current = stopFn
        // engines that don't fire `onPartial` keep us in
        // requesting-permission until they do — surface `listening`
        // optimistically so the UI doesn't appear stuck.
        setStatus((prev) => (prev === 'requesting-permission' ? 'listening' : prev))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start dictation')
        setStatus('error')
        stopFnRef.current = null
      }
    },
    [engine],
  )

  const stop = useCallback(async (): Promise<void> => {
    const fn = stopFnRef.current
    stopFnRef.current = null
    if (fn) {
      try {
        await fn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stop dictation')
        setStatus('error')
        return
      }
    }
    setStatus('idle')
    setPartialTranscript('')
  }, [])

  const reset = useCallback((): void => {
    setStatus(supported ? 'idle' : 'unsupported')
    setPartialTranscript('')
    setFinalTranscript('')
    setError(undefined)
  }, [supported])

  return {
    status,
    partialTranscript,
    finalTranscript,
    error,
    isSupported: supported,
    start,
    stop,
    reset,
  }
}
