import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

export type OptionPickerOption = {
  value: string
  label: string
}

export type OptionPickerProps = {
  /** The trigger element the popover anchors to. */
  anchorEl: HTMLElement
  /** Currently-selected option value. */
  value: string
  /** Options rendered in list order. */
  options: ReadonlyArray<OptionPickerOption>
  onSelect: (value: string) => void
  onClose: () => void
  /** Accessible name for the popover. */
  ariaLabel?: string
}

function useOutsideClick(refs: RefObject<HTMLElement | null>[], onOutside: () => void) {
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      const inside = refs.some((r) => r.current && r.current.contains(t))
      if (!inside) onOutside()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [refs, onOutside])
}

function positionFor(
  anchor: HTMLElement,
  gap = 8,
): { top: number; left: number; minWidth: number; side: 'top' | 'bottom' } {
  const r = anchor.getBoundingClientRect()
  const threshold = 180
  const side = window.innerHeight - r.bottom < threshold ? 'top' : 'bottom'
  const top =
    side === 'bottom' ? r.bottom + window.scrollY + gap : r.top + window.scrollY - threshold - gap
  const left = r.left + window.scrollX
  return { top, left, minWidth: r.width, side }
}

/**
 * Generic single-select dropdown rendered with the shared `.standard-picker`
 * popover recipe — the same surface as `StatusPicker`, so every toolbar
 * dropdown looks identical. Portals to `document.body` and positions itself
 * below (or above, when short on space) its anchor.
 */
export function OptionPicker({
  anchorEl,
  value,
  options,
  onSelect,
  onClose,
  ariaLabel = 'Select option',
}: OptionPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    minWidth: number
    side: 'top' | 'bottom'
  } | null>(null)

  useLayoutEffect(() => {
    setCoords(positionFor(anchorEl))
  }, [anchorEl])

  useOutsideClick([panelRef], onClose)

  const [active, setActive] = useState<string>(value)
  useEffect(() => setActive(value), [value])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!panelRef.current) return
      const idx = options.findIndex((o) => o.value === active)
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setActive(options[(idx + 1) % options.length]?.value ?? active)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setActive(options[(idx - 1 + options.length) % options.length]?.value ?? active)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSelect(active)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, options, onClose, onSelect])

  if (!coords) return null

  return createPortal(
    <div
      ref={panelRef}
      className={`standard-picker standard-picker--${coords.side}`}
      role="menu"
      aria-label={ariaLabel}
      style={{ top: coords.top, left: coords.left, minWidth: Math.max(120, coords.minWidth + 8) }}
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            role="menuitemradio"
            aria-checked={selected}
            className={`standard-picker__item ${o.value === active ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(o.value)
            }}
          >
            <span className="standard-picker__label">{o.label}</span>
            {selected && (
              <span className="standard-picker__check" aria-hidden>
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>,
    document.body,
  )
}

export default OptionPicker
