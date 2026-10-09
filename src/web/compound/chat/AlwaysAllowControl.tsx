import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ALWAYS_ALLOW_MENU_LABEL } from '../../../headless/utils/alwaysAllowConstants'
import type { AlwaysAllowChoiceView, AlwaysAllowScope } from '../../../headless/utils/chatTypes'
import { IconCheck, IconChevron } from '../../icons'

export type AlwaysAllowControlProps = {
  view: AlwaysAllowChoiceView
  toolName: string
  /** Always allow in `scope`, or (`undefined`) take a marked choice back. */
  onChoose: (scope: AlwaysAllowScope | undefined) => void
  /** `row`: the compact link on a tool row. `button`: a ghost button beside a card's decisions. */
  variant?: 'row' | 'button'
  disabled?: boolean
}

/**
 * "Always allow" as a split control: one click gives the default — the chat
 * the ask was raised in — and the chevron opens the other places it can apply,
 * each saying what it allows.
 */
export default function AlwaysAllowControl({
  view,
  toolName,
  onChoose,
  variant = 'row',
  disabled = false,
}: AlwaysAllowControlProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const wrapRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open || !wrapRef.current) return
    const measure = () => setAnchor(wrapRef.current?.getBoundingClientRect() ?? null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isRow = variant === 'row'
  const primaryClass = isRow
    ? `text-[11px] underline-offset-2 hover:underline ${
        view.marked
          ? 'font-semibold text-green-600 dark:text-green-400'
          : 'text-(--text-secondary) hover:text-(--text-primary)'
      }`
    : 'btn btn-ghost btn-sm rounded-r-none'
  const chevronClass = isRow
    ? 'rounded p-0.5 text-(--text-secondary) hover:bg-(--surface-raised) hover:text-(--text-primary)'
    : 'btn btn-ghost btn-sm rounded-l-none border-l border-(--border-subtle) px-1.5'

  return (
    <span
      ref={wrapRef}
      className="inline-flex shrink-0 items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isRow ? view.marked : undefined}
        title={view.title}
        className={`${primaryClass} disabled:opacity-50`}
        onClick={() => onChoose(view.primary.scope)}
      >
        {view.primary.label}
      </button>
      {view.options.length > 0 ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={ALWAYS_ALLOW_MENU_LABEL(toolName)}
          title={ALWAYS_ALLOW_MENU_LABEL(toolName)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`${chevronClass} disabled:opacity-50`}
          onClick={() => setOpen((v) => !v)}
        >
          <IconChevron className="size-3.5 rotate-90" />
        </button>
      ) : null}
      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Dismiss menu"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="menu"
                aria-label={ALWAYS_ALLOW_MENU_LABEL(toolName)}
                className="fixed z-50 flex w-72 max-w-[calc(100vw-16px)] flex-col rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-1.5 shadow-xl"
                style={{
                  top: (anchor?.bottom ?? 0) + 6,
                  right: Math.max(8, window.innerWidth - (anchor?.right ?? window.innerWidth - 8)),
                }}
              >
                {view.options.map((option) => (
                  <button
                    key={option.scope}
                    type="button"
                    role="menuitemradio"
                    aria-checked={option.selected}
                    onClick={() => {
                      setOpen(false)
                      onChoose(option.scope)
                    }}
                    className="flex items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-(--surface-hover)"
                  >
                    <span className="mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center text-green-600 dark:text-green-400">
                      {option.selected ? <IconCheck className="size-3.5" /> : null}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13px] text-(--text-primary)">{option.label}</span>
                      <span className="text-[11px] text-(--text-secondary)">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </span>
  )
}
