import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type ContextMenuItem = {
  key: string
  label: string
  /** Disables the item and says why, under its label. */
  disabledReason?: string
  /** Drawn in the danger tone, after a divider. */
  destructive?: boolean
  onSelect: () => void
}

export type ContextMenuProps = {
  /** Where the menu opens — the pointer of the right-click; `null` keeps it closed. */
  at: { x: number; y: number } | null
  items: readonly ContextMenuItem[]
  onClose: () => void
  /** Names the menu for a screen reader. */
  label?: string
}

const EDGE_GAP_PX = 8

/**
 * A right-click menu opened at the pointer, kept inside the viewport. Each item
 * closes the menu before it acts; a disabled item says why. The pointer-anchored
 * peer of `OverflowMenu`.
 */
export default function ContextMenu({ at, items, onClose, label }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!at) {
      setPos(null)
      return
    }
    const el = menuRef.current
    const w = el?.offsetWidth ?? 0
    const h = el?.offsetHeight ?? 0
    setPos({
      left: Math.max(EDGE_GAP_PX, Math.min(at.x, window.innerWidth - w - EDGE_GAP_PX)),
      top: Math.max(EDGE_GAP_PX, Math.min(at.y, window.innerHeight - h - EDGE_GAP_PX)),
    })
  }, [at])

  useEffect(() => {
    if (!at) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
    }
  }, [at, onClose])

  if (!at) return null
  const safe = items.filter((i) => !i.destructive)
  const destructive = items.filter((i) => i.destructive)

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Dismiss menu"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        className="fixed z-50 flex w-72 max-w-[calc(100vw-16px)] flex-col rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-1.5 shadow-xl"
        style={{
          top: pos?.top ?? at.y,
          left: pos?.left ?? at.x,
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        {safe.map((item) => (
          <ContextMenuRow key={item.key} item={item} onClose={onClose} />
        ))}
        {safe.length > 0 && destructive.length > 0 ? (
          <div className="my-1 h-px bg-(--border-subtle)" />
        ) : null}
        {destructive.map((item) => (
          <ContextMenuRow key={item.key} item={item} onClose={onClose} />
        ))}
      </div>
    </>,
    document.body,
  )
}

function ContextMenuRow({ item, onClose }: { item: ContextMenuItem; onClose: () => void }) {
  const disabled = !!item.disabledReason
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={item.disabledReason}
      onClick={() => {
        onClose()
        item.onSelect()
      }}
      className={`flex flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left text-[13px] enabled:hover:bg-(--surface-hover) disabled:cursor-not-allowed ${item.destructive ? 'text-(--status-stuck-soft-fg)' : 'text-(--text-primary)'}`}
    >
      <span className={`break-all ${disabled ? 'opacity-50' : ''}`}>{item.label}</span>
      {item.disabledReason ? (
        <span className="text-[11px] text-(--text-muted)">{item.disabledReason}</span>
      ) : null}
    </button>
  )
}
