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

export type FileMentionsTextareaProps = {
  value: string
  onChange: (next: string) => void
  /**
   * Returns ranked path suggestions for the active `@<token>`. When omitted,
   * the dropdown is disabled and the textarea behaves as a plain `Textarea`.
   * Library is decoupled from any file source — the consumer wires it.
   */
  onSearchFiles?: (token: string) => string[]
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

  const parse = useMemo(() => parseMention(value, cursor), [value, cursor])
  const suggestions = useMemo(
    () => (parse && onSearchFiles ? onSearchFiles(parse.token) : []),
    [parse, onSearchFiles],
  )
  const showMenu = !!parse && suggestions.length > 0

  useEffect(() => {
    if (highlight >= suggestions.length) setHighlight(0)
  }, [suggestions, highlight])

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

  const acceptSuggestion = useCallback(
    (path: string) => {
      if (!parse) return
      const next = applyMention(value, parse, path)
      pendingCursor.current = next.cursor
      onChange(next.text)
      setCursor(next.cursor)
    },
    [parse, value, onChange],
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (h + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        acceptSuggestion(suggestions[highlight])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        // Move past the @-token so parseMention returns null and the menu hides.
        if (parse) setCursor(parse.end + 1)
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
      {showMenu && (
        <ul
          role="listbox"
          aria-label="File suggestions"
          className="absolute bottom-full left-0 right-0 mb-1 max-h-56 overflow-auto rounded border border-(--border-subtle) bg-(--surface-raised) text-sm shadow-lg z-20"
        >
          {suggestions.map((path, idx) => (
            <li
              key={path}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(ev) => {
                ev.preventDefault()
                setHighlight(idx)
                acceptSuggestion(path)
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
