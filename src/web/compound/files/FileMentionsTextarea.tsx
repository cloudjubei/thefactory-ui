import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEventHandler,
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEventHandler,
  type ReactEventHandler,
} from 'react'
import { Textarea } from '../../primitives/Textarea'
import { applyMention, parseMention } from './mention'
import {
  applyReference,
  parseReference,
  type ReferenceSuggestion,
} from './reference'

export type FileMentionsTextareaProps = {
  value: string
  onChange: (next: string) => void
  /**
   * Returns ranked path suggestions for the active `@<token>`. When omitted,
   * the `@`-dropdown is disabled. Library is decoupled from any file source —
   * the consumer wires it.
   */
  onSearchFiles?: (token: string) => string[]
  /**
   * Returns ranked reference suggestions for the active `#<token>` (typically
   * stories / features). When omitted, the `#`-dropdown is disabled. Library
   * is decoupled from any reference source — the consumer wires it.
   */
  onSearchReferences?: (token: string) => ReferenceSuggestion[]
  /**
   * Fires AFTER the user accepts an `@`-file mention from the dropdown (via
   * Enter, Tab, or click). Useful for consumer-side side effects such as
   * tracking which files are now referenced in the text.
   */
  onAcceptFileMention?: (path: string) => void
  /**
   * Fires AFTER the user accepts a `#`-reference from the dropdown. Receives
   * the suggestion's `value` (the canonical reference string).
   */
  onAcceptReference?: (value: string) => void
  /** Submit on Enter (without Shift). Omitted → Enter inserts a newline. */
  onSubmit?: () => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  className?: string
  ariaLabel?: string
  autoFocus?: boolean
  /** Forwarded textarea event handlers. Library handlers run first. */
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onSelect?: ReactEventHandler<HTMLTextAreaElement>
  onMouseUp?: MouseEventHandler<HTMLTextAreaElement>
  onFocus?: FocusEventHandler<HTMLTextAreaElement>
}

function FileMentionsTextareaInner(
  {
    value,
    onChange,
    onSearchFiles,
    onSearchReferences,
    onAcceptFileMention,
    onAcceptReference,
    onSubmit,
    placeholder,
    rows = 3,
    disabled,
    className,
    ariaLabel,
    autoFocus,
    onKeyDown,
    onSelect,
    onMouseUp,
    onFocus,
  }: FileMentionsTextareaProps,
  forwardedRef: ForwardedRef<HTMLTextAreaElement>,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef],
  )

  const [cursor, setCursor] = useState(0)
  const [highlight, setHighlight] = useState(0)
  // Set after a programmatic edit so the next paint can restore the cursor.
  const pendingCursor = useRef<number | null>(null)

  // The caret can only be inside ONE active token at a time — `parseMention`
  // and `parseReference` are mutually exclusive by construction. We pick
  // whichever matches and feed the matching dropdown.
  const mentionParse = useMemo(() => parseMention(value, cursor), [value, cursor])
  const referenceParse = useMemo(() => parseReference(value, cursor), [value, cursor])

  const fileSuggestions = useMemo(
    () => (mentionParse && onSearchFiles ? onSearchFiles(mentionParse.token) : []),
    [mentionParse, onSearchFiles],
  )
  const refSuggestions = useMemo(
    () => (referenceParse && onSearchReferences ? onSearchReferences(referenceParse.token) : []),
    [referenceParse, onSearchReferences],
  )

  const showFileMenu = !!mentionParse && fileSuggestions.length > 0
  const showRefMenu = !showFileMenu && !!referenceParse && refSuggestions.length > 0
  const menuLength = showFileMenu ? fileSuggestions.length : showRefMenu ? refSuggestions.length : 0

  useEffect(() => {
    if (highlight >= menuLength) setHighlight(0)
  }, [menuLength, highlight])

  useEffect(() => {
    if (pendingCursor.current === null) return
    const node = innerRef.current
    if (!node) return
    const pos = pendingCursor.current
    node.setSelectionRange(pos, pos)
    pendingCursor.current = null
  }, [value])

  const trackCursor = useCallback(() => {
    const node = innerRef.current
    if (node) setCursor(node.selectionStart ?? 0)
  }, [])

  const acceptFileSuggestion = useCallback(
    (path: string) => {
      if (!mentionParse) return
      const next = applyMention(value, mentionParse, path)
      pendingCursor.current = next.cursor
      onChange(next.text)
      setCursor(next.cursor)
      onAcceptFileMention?.(path)
    },
    [mentionParse, value, onChange, onAcceptFileMention],
  )

  const acceptRefSuggestion = useCallback(
    (refValue: string) => {
      if (!referenceParse) return
      const next = applyReference(value, referenceParse, refValue)
      pendingCursor.current = next.cursor
      onChange(next.text)
      setCursor(next.cursor)
      onAcceptReference?.(refValue)
    },
    [referenceParse, value, onChange, onAcceptReference],
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showFileMenu || showRefMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (h + 1) % menuLength)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (h - 1 + menuLength) % menuLength)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (showFileMenu) acceptFileSuggestion(fileSuggestions[highlight])
        else acceptRefSuggestion(refSuggestions[highlight].value)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        // Move past the token so the menu hides on next render.
        if (showFileMenu && mentionParse) setCursor(mentionParse.end + 1)
        else if (showRefMenu && referenceParse) setCursor(referenceParse.end + 1)
        return
      }
    }
    if (onSubmit && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
      return
    }
    onKeyDown?.(e)
  }

  return (
    <div className="relative">
      {showFileMenu && (
        <ul
          role="listbox"
          aria-label="File suggestions"
          className="absolute bottom-full left-0 right-0 mb-1 max-h-56 overflow-auto rounded border border-(--border-subtle) bg-(--surface-raised) text-sm shadow-lg z-20"
        >
          {fileSuggestions.map((path, idx) => (
            <li
              key={path}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(ev) => {
                ev.preventDefault()
                setHighlight(idx)
                acceptFileSuggestion(path)
              }}
              className={[
                'px-3 py-1 cursor-pointer truncate text-(--text-primary)',
                idx === highlight ? 'bg-(--surface-hover)' : '',
              ].join(' ')}
              title={path}
            >
              {path}
            </li>
          ))}
        </ul>
      )}
      {showRefMenu && (
        <ul
          role="listbox"
          aria-label="Reference suggestions"
          className="absolute bottom-full left-0 right-0 mb-1 max-h-56 overflow-auto rounded border border-(--border-subtle) bg-(--surface-raised) text-sm shadow-lg z-20"
        >
          {refSuggestions.map((sug, idx) => (
            <li
              key={sug.value}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(ev) => {
                ev.preventDefault()
                setHighlight(idx)
                acceptRefSuggestion(sug.value)
              }}
              className={[
                'px-3 py-1 cursor-pointer text-(--text-primary)',
                idx === highlight ? 'bg-(--surface-hover)' : '',
              ].join(' ')}
              title={sug.description ? `${sug.label} — ${sug.description}` : sug.label}
            >
              <div className="truncate">{sug.label}</div>
              {sug.description && (
                <div className="text-xs truncate text-(--text-muted)">{sug.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Textarea
        ref={setRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          trackCursor()
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={trackCursor}
        onClick={trackCursor}
        onSelect={(e) => {
          trackCursor()
          onSelect?.(e)
        }}
        onMouseUp={(e) => {
          trackCursor()
          onMouseUp?.(e)
        }}
        onFocus={onFocus}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
      />
    </div>
  )
}

const FileMentionsTextarea = forwardRef(FileMentionsTextareaInner)
export default FileMentionsTextarea
