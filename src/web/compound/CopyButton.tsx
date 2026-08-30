import { useCallback, useEffect, useRef, useState } from 'react'
import { IconCheck } from '../icons/IconCheck'
import { IconCopy } from '../icons/IconCopy'
import { cn } from '../utils/cn'

export type CopyButtonProps = {
  /** Text to copy when the button is clicked. */
  text: string
  /** Optional className applied to the button — usually used to position
   *  the button (e.g. `absolute top-2 right-2`) and to control its
   *  visibility (e.g. `opacity-0 group-hover:opacity-100`). */
  className?: string
  /** How long the "copied" checkmark stays visible. Defaults to 1500ms. */
  feedbackMs?: number
  title?: string
  /** When set, the button widens to show this text beside the icon and swaps
   *  it for "Copied" on success. Omit for the icon-only form. */
  label?: string
}

/**
 * Tiny clipboard button. Renders the clipboard icon by default and briefly
 * swaps to a checkmark after a successful copy. Used in places like the
 * Tools view result panel — the caller typically positions this absolutely
 * inside a `group` wrapper so it appears on hover.
 */
export function CopyButton({
  text,
  className,
  feedbackMs = 1500,
  title = 'Copy to clipboard',
  label,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), feedbackMs)
    } catch {
      // Clipboard API can fail (insecure context, permission). Swallow —
      // the result text is still visible on screen.
    }
  }, [text, feedbackMs])

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? 'Copied' : title}
      title={copied ? 'Copied' : title}
      className={cn(
        'inline-flex items-center justify-center h-7 rounded border',
        label ? 'gap-1.5 px-2 text-[12px]' : 'w-7',
        'border-(--border-subtle) bg-(--surface-raised) text-(--text-muted)',
        'hover:text-(--text-primary) hover:bg-(--surface-muted)',
        'focus:outline-none focus-visible:ring-2',
        className,
      )}
    >
      {copied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
      {label ? <span>{copied ? 'Copied' : label}</span> : null}
    </button>
  )
}
