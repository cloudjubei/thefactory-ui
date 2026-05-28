import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import { rankMentionMatches } from '../files/mention'
import type { ReferenceSuggestion } from '../files/reference'
import Tooltip from '../../primitives/Tooltip'
import { Modal } from '../../primitives/Modal'
import { Button } from '../../primitives/Button'
import { IconAttach, IconMic, IconSend } from '../../icons'
import {
  useNativeDictationTrigger,
  useSpeechToText,
  type NativeDictationResult,
} from '../../../headless'
import DictationWave from './DictationWave'

type SendReason = 'user' | 'suggested_action'

export type ChatInputAttachment = string

export type ChatInputProps = {
  value: string
  attachments?: ChatInputAttachment[]
  onChange: (val: string) => void
  onChangeAttachments?: (next: ChatInputAttachment[]) => void

  /** Restore caret/selection when switching chats. */
  selectionStart?: number
  selectionEnd?: number
  onSelectionChange?: (next: { selectionStart?: number; selectionEnd?: number }) => void

  onSend: (
    message: string,
    attachments: ChatInputAttachment[],
    meta?: { reason?: SendReason },
  ) => void | Promise<void>
  onAbort?: () => void
  isThinking?: boolean
  isConfigured?: boolean

  /** Suggested quick-reply chips from the last assistant turn. */
  suggestedActions?: string[]

  /** Optional file mentions (@). When omitted, the @ autocomplete is disabled. */
  filePaths?: string[]
  /** Optional reference suggestions (#). Consumers feed in story/feature
   * suggestions; library doesn't know the source. When omitted, the
   * #-dropdown is disabled. */
  onSearchReferences?: (token: string) => ReferenceSuggestion[]
  /** Fires after the user accepts a `#`-reference from the dropdown. */
  onAcceptReference?: (value: string) => void

  /** Attachment uploader — receives the picked File and should return the
   * stored path (which gets appended to `attachments`). When omitted, the
   * attach button is hidden. */
  onUploadAttachment?: (file: File) => Promise<string | undefined>

  autoFocus?: boolean
  /** Key that, when changed, restores caret position to the end (used when
   * switching chats). */
  restoreKey?: string

  clearOnSend?: boolean
  clearOnSuggestedAction?: boolean

  /** Override the placeholder. Defaults to a context-aware string. */
  placeholder?: string

  /** Extra hints shown beneath the input. Defaults match desktop: @ files,
   * # stories/features, modifier-Enter. Pass `null` to hide entirely. */
  leftHints?: string[] | null
  rightHints?: string[] | null
}

const MAX_INPUT_HEIGHT_PX = 250

export default function ChatInput({
  value,
  attachments,
  onChange,
  onChangeAttachments,
  selectionStart,
  selectionEnd,
  onSelectionChange,
  onSend,
  onAbort,
  isThinking = false,
  isConfigured = true,
  suggestedActions,
  filePaths,
  onSearchReferences,
  onAcceptReference,
  onUploadAttachment,
  autoFocus,
  restoreKey,
  clearOnSend = false,
  clearOnSuggestedAction = false,
  placeholder,
  leftHints,
  rightHints,
}: ChatInputProps) {
  const safeValue = value ?? ''
  const safeAttachments = attachments ?? []

  const [flashBlocked, setFlashBlocked] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLDivElement>(null)

  // Dictation runs through one of two host-supplied paths:
  //
  //  1. `SpeechToTextEngine` — engine with onPartial/onFinal/onError
  //     callbacks (mobile uses this with expo-speech-recognition).
  //     Tapping the mic takes over the composer with our in-app
  //     overlay (waveform, partial transcript inline, Stop button).
  //
  //  2. `NativeDictationTrigger` — fire-and-forget handoff to the
  //     OS's own dictation flow (desktop macOS uses this to trigger
  //     Fn-twice via osascript). We have no callback stream so we
  //     CAN'T drive the overlay — text lands in the focused textarea
  //     directly via the OS's text input services. The mic button
  //     just dispatches; macOS owns the rest.
  //
  // When both are present (no host does this today, but the design
  // allows it), the native trigger wins because it's the OS-native
  // experience the user already knows.
  const speech = useSpeechToText()
  const nativeDictation = useNativeDictationTrigger()
  const hasNativeDictation = nativeDictation?.isSupported() ?? false
  const dictationAvailable = hasNativeDictation || speech.isSupported
  const isDictating =
    !hasNativeDictation &&
    (speech.status === 'listening' || speech.status === 'requesting-permission')
  const [nativeError, setNativeError] = useState<string | null>(null)

  /**
   * Append a chunk of dictated text to the current `value`, separating
   * with a single space when the buffer ends mid-sentence. Returns the
   * new buffer string so callers can chain with `speech.reset()`.
   */
  const appendDictation = useCallback(
    (chunk: string): string => {
      const trimmedBuffer = safeValue.replace(/\s+$/, '')
      const separator = trimmedBuffer.length > 0 ? ' ' : ''
      const next = `${trimmedBuffer}${separator}${chunk}`
      onChange(next)
      return next
    },
    [safeValue, onChange],
  )

  // Finalised utterances arriving mid-dictation — engines fire these
  // whenever they detect a sentence boundary. We commit each into the
  // buffer immediately so the user sees their words land in real time.
  const lastAppendedFinalRef = useRef<string>('')
  useEffect(() => {
    if (!speech.finalTranscript) return
    if (speech.finalTranscript === lastAppendedFinalRef.current) return
    lastAppendedFinalRef.current = speech.finalTranscript
    appendDictation(speech.finalTranscript)
    speech.reset()
    // Don't depend on appendDictation — it recreates every render via
    // its dependency on `safeValue`. We only want to fire when a new
    // final lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.finalTranscript])

  const startDictation = useCallback(() => {
    setNativeError(null)
    if (nativeDictation) {
      // Native path: dispatch the OS's dictation flow and immediately
      // return — we have no overlay to maintain, the OS owns the
      // experience from here. A failure result surfaces via the same
      // Modal the engine path uses.
      void (async () => {
        try {
          const result: NativeDictationResult = await nativeDictation.trigger()
          if (result.status !== 'started') setNativeError(result.reason || 'unknown')
        } catch (err) {
          setNativeError(err instanceof Error ? err.message : String(err))
        }
      })()
      return
    }
    lastAppendedFinalRef.current = ''
    void speech.start()
  }, [nativeDictation, speech])

  const stopDictation = useCallback(() => {
    // Engines aren't required to flush a final when stop() is called
    // mid-utterance. If the user has spoken since the last final, the
    // pending partial would be lost — capture it explicitly here.
    const pendingPartial = speech.partialTranscript.trim()
    if (pendingPartial && pendingPartial !== lastAppendedFinalRef.current) {
      lastAppendedFinalRef.current = pendingPartial
      appendDictation(pendingPartial)
    }
    void speech.stop()
  }, [speech, appendDictation])

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const platform = (navigator.platform || '').toLowerCase()
    const ua = (navigator.userAgent || '').toLowerCase()
    return platform.includes('mac') || ua.includes('mac')
  }, [])
  const modifierSymbol = isMac ? '⌘' : 'Ctrl'

  // -------- Autosize --------
  const autosizeRafRef = useRef<number | null>(null)
  const autosizeRetryTimerRef = useRef<number | null>(null)
  const autosizeFallbackTimerRef = useRef<number | null>(null)

  const autosizeNow = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.setProperty('height', 'auto', 'important')
    const next = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)
    el.style.setProperty('height', next + 'px', 'important')
  }, [])

  const requestAutosize = useCallback(() => {
    if (autosizeFallbackTimerRef.current) {
      window.clearTimeout(autosizeFallbackTimerRef.current)
      autosizeFallbackTimerRef.current = null
    }
    if (!autosizeRafRef.current) {
      autosizeRafRef.current = requestAnimationFrame(() => {
        autosizeRafRef.current = null
        autosizeNow()
      })
    }
    autosizeFallbackTimerRef.current = window.setTimeout(() => {
      autosizeFallbackTimerRef.current = null
      autosizeNow()
    }, 0)
  }, [autosizeNow])

  useLayoutEffect(() => {
    requestAutosize()
    if (autosizeRetryTimerRef.current) window.clearTimeout(autosizeRetryTimerRef.current)
    autosizeRetryTimerRef.current = window.setTimeout(() => {
      autosizeRetryTimerRef.current = null
      requestAutosize()
    }, 50)
    return () => {
      if (autosizeRetryTimerRef.current) {
        window.clearTimeout(autosizeRetryTimerRef.current)
        autosizeRetryTimerRef.current = null
      }
    }
  }, [safeValue, requestAutosize])

  useEffect(() => {
    requestAutosize()
  }, [requestAutosize, safeAttachments.length, suggestedActions?.length])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    let prevWidth = el.clientWidth
    const ro = new ResizeObserver(() => {
      const nextWidth = el.clientWidth
      if (nextWidth !== prevWidth) {
        prevWidth = nextWidth
        requestAutosize()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [requestAutosize])

  useEffect(() => {
    const el = chatInputRef.current
    if (!el) return
    const ro = new ResizeObserver(() => requestAutosize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [requestAutosize])

  useEffect(() => {
    const onResize = () => requestAutosize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [requestAutosize])

  // Cleanup pending timers/rAF on unmount.
  useEffect(() => {
    return () => {
      if (autosizeRafRef.current) cancelAnimationFrame(autosizeRafRef.current)
      if (autosizeRetryTimerRef.current) window.clearTimeout(autosizeRetryTimerRef.current)
      if (autosizeFallbackTimerRef.current) window.clearTimeout(autosizeFallbackTimerRef.current)
    }
  }, [])

  // -------- Restore caret / focus on chat switch --------
  const lastRestoreKeyRef = useRef<string | undefined>(restoreKey)
  useLayoutEffect(() => {
    if (restoreKey === undefined) return
    if (lastRestoreKeyRef.current === restoreKey) return
    lastRestoreKeyRef.current = restoreKey
    const el = textareaRef.current
    if (!el) return
    if (autoFocus) {
      try {
        el.focus()
      } catch {
        /* ignore */
      }
    }
    const len = el.value?.length ?? 0
    const hasSel = typeof selectionStart === 'number' || typeof selectionEnd === 'number'
    if (hasSel) {
      const start = Math.max(0, Math.min(selectionStart ?? len, len))
      const end = Math.max(0, Math.min(selectionEnd ?? start, len))
      try {
        el.setSelectionRange(start, end)
      } catch {
        /* ignore */
      }
    } else {
      try {
        el.setSelectionRange(len, len)
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreKey])

  useEffect(() => {
    if (!autoFocus) return
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [autoFocus])

  const emitSelectionNow = useCallback(() => {
    if (!onSelectionChange) return
    const el = textareaRef.current
    if (!el) return
    onSelectionChange({
      selectionStart: el.selectionStart ?? undefined,
      selectionEnd: el.selectionEnd ?? undefined,
    })
  }, [onSelectionChange])

  const triggerBlockedFlash = () => {
    setFlashBlocked(true)
    window.setTimeout(() => setFlashBlocked(false), 300)
  }

  const clearInput = () => {
    onChange('')
    onChangeAttachments?.([])
    onSelectionChange?.({ selectionStart: 0, selectionEnd: 0 })
  }

  const handleSend = () => {
    if (isThinking) {
      triggerBlockedFlash()
      return
    }
    if (!safeValue.trim() && safeAttachments.length === 0) return
    void onSend(safeValue, safeAttachments, { reason: 'user' })
    if (clearOnSend) clearInput()
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      requestAutosize()
    })
  }

  const handleSuggested = (action: string) => {
    if (isThinking || !isConfigured) return
    void onSend(action, [], { reason: 'suggested_action' })
    if (clearOnSuggestedAction) clearInput()
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      requestAutosize()
    })
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (isThinking) {
        triggerBlockedFlash()
        return
      }
      handleSend()
    }
    // Plain Enter inserts a newline (matches desktop). Cmd/Ctrl+Enter sends.
  }

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadAttachment) return
    try {
      const path = await onUploadAttachment(file)
      if (path && onChangeAttachments) {
        const next = Array.from(new Set([...safeAttachments, path]))
        onChangeAttachments(next)
      }
    } finally {
      e.target.value = ''
    }
  }

  const onSearchFiles = useCallback(
    (token: string) => rankMentionMatches(filePaths ?? [], token, 8),
    [filePaths],
  )

  const canSend = (safeValue.trim().length > 0 || safeAttachments.length > 0) && isConfigured

  const resolvedPlaceholder =
    placeholder ??
    (isConfigured
      ? 'Type your message…'
      : 'You can compose a message and reference files (@) and stories/features (#) even before configuring. Configure LLM to send.')

  const defaultLeftHints = ['Use @ for file references', 'Use # for stories & features']
  const defaultRightHints = [`${modifierSymbol} + Enter to send`]
  const lh = leftHints === null ? [] : (leftHints ?? defaultLeftHints)
  const rh = rightHints === null ? [] : (rightHints ?? defaultRightHints)

  const showHints = lh.length > 0 || rh.length > 0
  const renderHintsGrid = () => (
    <div className="grid grid-cols-2 grid-rows-2 gap-x-4 text-[12px] text-(--text-muted)">
      {lh.length <= 1 ? (
        <div className="col-start-1 row-span-2 self-center truncate">{lh[0] ?? ''}</div>
      ) : (
        <>
          <div className="col-start-1 row-start-1 truncate">{lh[0]}</div>
          <div className="col-start-1 row-start-2 truncate">{lh[1]}</div>
        </>
      )}
      {rh.length <= 1 ? (
        <div className="col-start-2 row-span-2 self-center text-right truncate">{rh[0] ?? ''}</div>
      ) : (
        <>
          <div className="col-start-2 row-start-1 text-right truncate">{rh[0]}</div>
          <div className="col-start-2 row-start-2 text-right truncate">{rh[1]}</div>
        </>
      )}
    </div>
  )

  const showSuggestedActions =
    !isThinking && isConfigured && Array.isArray(suggestedActions) && suggestedActions.length > 0

  return (
    <div
      ref={chatInputRef}
      className="shrink-0 border-t border-(--border-subtle) bg-(--surface-raised)"
    >
      {showSuggestedActions ? (
        <div
          className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-(--border-subtle)"
          role="group"
          aria-label="Suggested replies"
        >
          {suggestedActions!.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggested(action)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[13px] leading-tight border border-(--border-default) bg-(--surface-base) text-(--text-secondary) hover:bg-(--surface-overlay) hover:text-(--text-primary) hover:border-(--accent-primary) focus:outline-none focus:ring-2 focus:ring-(--focus-ring) transition-colors duration-150"
              title={action}
            >
              {action}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleFormSubmit} className="p-2">
        <div className="flex gap-2">
          <div
            className={[
              'flex-1 bg-(--surface-base) border rounded-md focus-within:ring-2',
              'border-(--border-default) focus-within:ring-(--focus-ring)',
              flashBlocked ? 'border-red-500 ring-2 ring-red-500/60' : '',
            ].join(' ')}
          >
            <div className="relative p-1">
              <FileMentionsTextarea
                ref={textareaRef}
                value={
                  // While dictating, show the live transcript inside the
                  // textarea (existing buffer + current partial). The
                  // engine's `onFinal` events still commit into `value`
                  // through `onChange`; the partial is what's currently
                  // tentative. Once Stop fires, the partial commits too
                  // and `value` carries everything.
                  isDictating
                    ? `${safeValue}${
                        safeValue && speech.partialTranscript ? ' ' : ''
                      }${speech.partialTranscript}`
                    : safeValue
                }
                onChange={(val) => {
                  onChange(val)
                  requestAutosize()
                }}
                onSearchFiles={onSearchFiles}
                onSearchReferences={onSearchReferences}
                onAcceptReference={onAcceptReference}
                placeholder={
                  isDictating
                    ? speech.status === 'requesting-permission'
                      ? 'Waiting for microphone…'
                      : 'Listening…'
                    : resolvedPlaceholder
                }
                rows={1}
                disabled={isDictating}
                ariaLabel="Message input"
                onKeyDown={handleKeyDown}
                onSelect={() => emitSelectionNow()}
                onMouseUp={() => emitSelectionNow()}
                className="w-full resize-none bg-transparent px-2 py-1 outline-none text-(--text-primary)"
                style={{ maxHeight: MAX_INPUT_HEIGHT_PX, overflowY: 'auto' }}
              />
            </div>

            {/* Attachments + bottom hints */}
            {(safeAttachments.length > 0 || showHints) && (
              <div className="px-2 py-1.5 border-t border-(--border-subtle)">
                {safeAttachments.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {safeAttachments.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 text-[11px] rounded-full border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) px-2 py-[1px]"
                        title={p}
                      >
                        <span className="truncate max-w-[140px]">{p.split('/').pop() ?? p}</span>
                        {onChangeAttachments ? (
                          <button
                            type="button"
                            className="opacity-60 hover:opacity-100"
                            onClick={() =>
                              onChangeAttachments(safeAttachments.filter((x) => x !== p))
                            }
                            aria-label={`Remove ${p}`}
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}

                {showHints ? renderHintsGrid() : null}
              </div>
            )}
          </div>

          {/* Right-side vertical controls. While dictating, the entire
              column collapses to a waveform indicator stacked above a
              Stop button — every other affordance is irrelevant until
              the user stops dictating. */}
          <div className="relative w-10">
            {isDictating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <DictationWave />
                <Tooltip content="Stop dictation">
                  <button
                    type="button"
                    onClick={stopDictation}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-(--accent-primary)/15 text-(--accent-primary) hover:bg-(--accent-primary)/25 focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
                    aria-label="Stop dictation"
                  >
                    <span className="block w-3.5 h-3.5 rounded-xs bg-(--accent-primary)" />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="absolute top-0 left-0 right-0 flex items-start justify-center">
                  <Tooltip content="Attach files">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-(--surface-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring) disabled:opacity-40"
                      aria-label="Attach files"
                      title="Attach files"
                      disabled={!onUploadAttachment}
                    >
                      <IconAttach className="w-5 h-5" />
                    </button>
                  </Tooltip>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.json,.js,.jsx,.ts,.tsx,.css,.scss,.less,.html,.htm,.xml,.yml,.yaml,.csv,.log,.sh,.bash,.zsh,.bat,.ps1,.py,.rb,.java,.kt,.go,.rs,.c,.h,.cpp,.hpp,.m,.swift,.ini,.conf,.env"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  {!isThinking ? (
                    <Tooltip content="Send (Enter)">
                      <button
                        type="submit"
                        disabled={!canSend}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-md disabled:opacity-40 hover:bg-(--surface-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
                        aria-label="Send message"
                      >
                        <IconSend className="w-5 h-5" />
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Stop">
                      <button
                        type="button"
                        onClick={() => {
                          if (!onAbort) return
                          const ok = window.confirm(
                            'Stop the assistant? This will cancel the current response.',
                          )
                          if (!ok) return
                          onAbort()
                        }}
                        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-(--surface-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
                        aria-label="Stop response"
                      >
                        <span
                          className="absolute inset-0 m-auto block w-7 h-7 rounded-full border-2 border-(--text-muted) border-t-transparent animate-spin"
                          aria-hidden
                        />
                        <span
                          className="relative z-10 block w-3.5 h-3.5 rounded-xs"
                          style={{ background: 'var(--text-primary)' }}
                        />
                      </button>
                    </Tooltip>
                  )}
                </div>

                {dictationAvailable && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center">
                    <Tooltip content="Dictate" placement="top">
                      <button
                        type="button"
                        onClick={startDictation}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-(--surface-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
                        aria-label="Dictate"
                      >
                        <IconMic className="w-5 h-5" />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </form>

      {/* Dictation error popup. Surfaces failures from BOTH paths —
          the in-app engine (`speech.status === 'error'`) and the
          native trigger (`nativeError`) — through the same Modal so
          the user sees one consistent feedback surface. On
          accessibility-permission failure the secondary action opens
          System Settings directly. */}
      {(() => {
        const errorCode = nativeError ?? (speech.status === 'error' ? speech.error : undefined)
        const open = errorCode !== undefined && errorCode !== null
        const dismiss = () => {
          setNativeError(null)
          if (speech.status === 'error') speech.reset()
        }
        return (
          <Modal
            isOpen={open}
            onClose={dismiss}
            title={dictationErrorTitle(errorCode ?? '')}
            size="sm"
          >
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-(--text-primary)">{dictationErrorMessage(errorCode ?? '')}</p>
              {dictationErrorHint(errorCode ?? '') && (
                <p className="text-(--text-secondary) text-[12px]">
                  {dictationErrorHint(errorCode ?? '')}
                </p>
              )}
              <div className="flex justify-end gap-2">
                {errorCode === 'accessibility-permission' &&
                  isElectronSystemDictationAvailable() && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        void getElectronSystemDictation()?.openSettings?.()
                      }}
                    >
                      Open System Settings
                    </Button>
                  )}
                <Button variant="primary" onClick={dismiss}>
                  OK
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

/**
 * Detect the desktop preload bridge that exposes
 * `window.systemDictation.openSettings`. Returns false on web / mobile
 * (no bridge wired), so the "Open System Settings" button only renders
 * where it actually does something.
 *
 * `thefactory-ui` doesn't know about `window.systemDictation` (that's
 * overseer-local's preload contract), so we read it through a local
 * cast — the consumer side defines the type via ambient declaration.
 */
interface SystemDictationBridge {
  trigger?: () => Promise<unknown>
  openSettings?: () => Promise<unknown> | unknown
}

function getElectronSystemDictation(): SystemDictationBridge | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { systemDictation?: SystemDictationBridge }
  return w.systemDictation ?? null
}

function isElectronSystemDictationAvailable(): boolean {
  return typeof getElectronSystemDictation()?.openSettings === 'function'
}

/**
 * Map the raw engine error codes (Web Speech API's `event.error` strings
 * and the engine adapters' fallbacks) to user-readable copy. Unknown
 * codes pass through verbatim so a misconfigured Electron build's
 * actual failure reason still surfaces.
 *
 * `network` is the desktop-Electron tell: the bundled Chromium exposes
 * `webkitSpeechRecognition` but ships without the speech service, so
 * the engine adapter's watchdog times out and reports `network`. We
 * surface that honestly here — blaming the user's internet (the literal
 * Web Speech API meaning of `network`) was misleading and unactionable.
 */
function dictationErrorTitle(raw: string | undefined): string {
  switch (raw) {
    case 'permission-denied':
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access needed'
    case 'accessibility-permission':
      return 'Accessibility permission needed'
    case 'no-speech':
      return 'No audio detected'
    case 'audio-capture':
      return 'Microphone unavailable'
    case 'not-macos':
      return 'Native dictation unavailable'
    case 'ipc-unavailable':
      return 'Dictation bridge missing'
    case 'network':
    case 'unsupported':
      return 'Dictation not available on this device'
    default:
      return 'Dictation unavailable'
  }
}

function dictationErrorMessage(raw: string | undefined): string {
  switch (raw) {
    case undefined:
    case '':
      return 'Dictation failed for an unknown reason. Please try again.'
    case 'permission-denied':
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied for this app.'
    case 'accessibility-permission':
      return 'To dictate from this button, the app needs permission to send keystrokes — that’s how it triggers macOS Dictation. Grant it under System Settings → Privacy & Security → Accessibility. You can also press Fn twice yourself any time to dictate.'
    case 'no-speech':
      return "We didn't catch any audio. Speak closer to the microphone and try again."
    case 'audio-capture':
      return 'No microphone was found, or another app is using it.'
    case 'not-macos':
      return 'This desktop app uses macOS Dictation under the hood. Native dictation isn’t wired up on this platform yet.'
    case 'ipc-unavailable':
      return 'The renderer couldn’t reach the desktop dictation bridge. Restart the app and try again.'
    case 'network':
    case 'unsupported':
      return "The desktop app doesn't include the speech recognition service yet. For voice input, use the mobile app — it works on iOS and Android. We're working on adding cloud dictation to desktop in a future release."
    case 'aborted':
      return 'Dictation was stopped before any audio was captured.'
    default:
      return `Dictation error: ${raw}`
  }
}

/**
 * Returns an optional secondary tip that complements the primary
 * message. Returns an empty string when no extra hint is useful (so the
 * UI doesn't render a dangling secondary paragraph).
 */
function dictationErrorHint(raw: string | undefined): string {
  switch (raw) {
    case 'permission-denied':
    case 'not-allowed':
    case 'service-not-allowed':
      return 'If you previously denied microphone access, allow it from your system settings and try again.'
    case 'accessibility-permission':
      return 'After granting permission, you may need to restart the app for the change to take effect.'
    case 'audio-capture':
      return 'Check that no other app (Zoom, voice memos, browser tabs) is holding the microphone.'
    default:
      return ''
  }
}
