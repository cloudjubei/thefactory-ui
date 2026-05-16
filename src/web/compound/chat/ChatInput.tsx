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
  type ReactNode,
} from 'react'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import { rankMentionMatches } from '../files/mention'
import type { ReferenceSuggestion } from '../files/reference'
import Tooltip from '../../primitives/Tooltip'
import { IconAttach, IconSend } from '../../icons'

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

  /** Right-side info popover content (Shortcuts & helpers). Optional — when
   * omitted, the default helper text is used. */
  infoPopoverContent?: ReactNode

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
  infoPopoverContent,
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
                value={safeValue}
                onChange={(val) => {
                  onChange(val)
                  requestAutosize()
                }}
                onSearchFiles={onSearchFiles}
                onSearchReferences={onSearchReferences}
                onAcceptReference={onAcceptReference}
                placeholder={resolvedPlaceholder}
                rows={1}
                disabled={false}
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

          {/* Right-side vertical controls anchored top/middle/bottom */}
          <div className="relative w-10">
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

            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center">
              <Tooltip
                content={
                  infoPopoverContent ?? (
                    <div className="p-2">
                      <div className="font-medium mb-1 text-(--text-secondary)">
                        Shortcuts & helpers
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Use @ for file references</li>
                        <li>Use # for stories & features</li>
                        <li>{modifierSymbol} + Enter to send</li>
                      </ul>
                    </div>
                  )
                }
                placement="top"
              >
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-pink-500 text-pink-600 bg-transparent hover:bg-pink-50 dark:hover:bg-pink-900/20 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                  aria-label="Shortcuts & helpers"
                >
                  <span className="text-[11px] font-semibold">i</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
