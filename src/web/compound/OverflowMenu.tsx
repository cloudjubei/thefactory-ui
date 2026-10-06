import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { IconDotsVertical } from '../icons'

export type OverflowMenuItem = {
  key: string
  label: string
  icon?: ReactNode
  /** Drawn in the danger tone, after a divider. */
  destructive?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type OverflowMenuProps = {
  items: readonly OverflowMenuItem[]
  /** Names the button for a screen reader and its tooltip. */
  label?: string
  className?: string
}

/**
 * An icon-only "more actions" button and its popover menu — the web peer of
 * native's `ActionMenu`. Each item closes the menu before it acts, so a confirm
 * it opens is never hidden behind the menu.
 */
export default function OverflowMenu({
  items,
  label = 'More actions',
  className,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open || !btnRef.current) return
    const measure = () => setAnchor(btnRef.current?.getBoundingClientRect() ?? null)
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

  const safe = items.filter((i) => !i.destructive)
  const destructive = items.filter((i) => i.destructive)

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex size-8 items-center justify-center rounded-md border ${open ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)' : 'border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)'} ${className ?? ''}`}
      >
        <IconDotsVertical className="size-4 rotate-90" />
      </button>
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
                className="fixed z-50 flex w-60 flex-col rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-1.5 shadow-xl"
                style={{
                  top: (anchor?.bottom ?? 0) + 6,
                  right: Math.max(8, window.innerWidth - (anchor?.right ?? window.innerWidth - 8)),
                }}
              >
                {safe.map((item) => (
                  <MenuRow key={item.key} item={item} onDone={() => setOpen(false)} />
                ))}
                {safe.length > 0 && destructive.length > 0 ? (
                  <div className="my-1 h-px bg-(--border-subtle)" />
                ) : null}
                {destructive.map((item) => (
                  <MenuRow key={item.key} item={item} onDone={() => setOpen(false)} />
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}

function MenuRow({ item, onDone }: { item: OverflowMenuItem; onDone: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={() => {
        onDone()
        item.onSelect()
      }}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-(--surface-hover) disabled:opacity-50 ${item.destructive ? 'text-(--status-stuck-soft-fg)' : 'text-(--text-primary)'}`}
    >
      {item.icon}
      {item.label}
    </button>
  )
}
