import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'
import { IconPlay } from '../icons'

/**
 * Agent-run button + picker. Mirrors the desktop implementation 1:1 — long-
 * press opens a portal picker, click triggers the default ("developer")
 * agent. Pointer-type aware (touch / pen / mouse), drag-resistant, and
 * keeps the host row's actions column visible while the picker is open via
 * a `.is-sticky-visible` toggle on the nearest `.col-actions` ancestor.
 */

export type AgentRunType = 'developer' | 'tester' | 'planner' | 'contexter' | 'speccer'

const AGENTS_ORDER: AgentRunType[] = ['speccer', 'planner', 'contexter', 'tester', 'developer']
const AGENTS_LABELS: Record<AgentRunType, string> = {
  speccer: 'Speccer',
  planner: 'Planner',
  contexter: 'Contexter',
  tester: 'Tester',
  developer: 'Developer',
}

function useOutsideClick(refs: React.RefObject<HTMLElement | null>[], onOutside: () => void) {
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computePosition(
  anchor: HTMLElement,
  panel: HTMLElement | null,
  gap = 8,
): { top: number; left: number; minWidth: number; side: 'top' | 'bottom' } {
  const ar = anchor.getBoundingClientRect()
  const scrollX = window.scrollX || window.pageXOffset
  const scrollY = window.scrollY || window.pageYOffset
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  const panelW = panel ? panel.offsetWidth : Math.max(160, ar.width)
  const panelH = panel ? panel.offsetHeight : 180

  const spaceBelow = viewportH - ar.bottom
  const side: 'top' | 'bottom' = spaceBelow < panelH + gap ? 'top' : 'bottom'

  let top: number
  if (side === 'bottom') {
    top = ar.bottom + scrollY + gap
  } else {
    top = ar.top + scrollY - panelH - gap
  }

  let left = ar.left + scrollX
  const padding = 8
  const maxLeft = scrollX + viewportW - panelW - padding
  const minLeft = scrollX + padding
  left = clamp(left, minLeft, maxLeft)

  const minTop = scrollY + padding
  const maxTop = scrollY + viewportH - panelH - padding
  top = clamp(top, minTop, maxTop)

  return { top, left, minWidth: ar.width, side }
}

export type AgentTypePickerProps = {
  anchorEl: HTMLElement
  value?: AgentRunType
  onSelect: (s: AgentRunType) => void
  onClose: () => void
}

export function AgentTypePicker({
  anchorEl,
  value = 'developer',
  onSelect,
  onClose,
}: AgentTypePickerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    minWidth: number
    side: 'top' | 'bottom'
  } | null>(null)

  useLayoutEffect(() => {
    const update = () => {
      setCoords(computePosition(anchorEl, panelRef.current))
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorEl])

  useOutsideClick([panelRef], onClose)

  const [active, setActive] = useState<AgentRunType>(value)
  useEffect(() => setActive(value), [value])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!panelRef.current) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      const idx = AGENTS_ORDER.indexOf(active)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setActive(AGENTS_ORDER[(idx + 1) % AGENTS_ORDER.length])
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setActive(AGENTS_ORDER[(idx - 1 + AGENTS_ORDER.length) % AGENTS_ORDER.length])
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSelect(active)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, onClose, onSelect])

  if (!coords) return null

  return createPortal(
    <div
      ref={panelRef}
      className={`standard-picker standard-picker--${coords.side}`}
      role="menu"
      aria-label="Select Agent"
      style={{
        top: coords.top,
        left: coords.left,
        minWidth: Math.max(120, coords.minWidth + 8),
        position: 'absolute',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      {AGENTS_ORDER.map((s) => (
        <button
          key={s}
          role="menuitemradio"
          className="standard-picker__item"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(s)
          }}
        >
          <span className="standard-picker__label">{AGENTS_LABELS[s]}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}

export type RunAgentButtonProps = {
  className?: string
  onClick: (next: AgentRunType) => void
  /** When set, the trigger renders with a visible text label instead of icon-only. */
  label?: string
  /**
   * Render the trigger as a plain `<button>` carrying this exact class
   * instead of the default `btn` styling — lets a host drop the control
   * into its own menu / list so it matches the surrounding rows.
   */
  triggerClassName?: string
}

export default function RunAgentButton({
  className = '',
  onClick,
  label,
  triggerClassName,
}: RunAgentButtonProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const pressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)
  const LONG_PRESS_MS = 500

  const clearPressTimer = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handleSelect = (t: AgentRunType) => {
    onClick(t)
    setOpen(false)
  }

  const handlePointerDown: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    if (
      e.button !== undefined &&
      e.button !== 0 &&
      e.pointerType !== 'touch' &&
      e.pointerType !== 'pen'
    )
      return
    e.stopPropagation()
    longPressTriggered.current = false
    clearPressTimer()
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setOpen(true)
    }, LONG_PRESS_MS)
  }

  const handlePointerUpLike: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation()
    clearPressTimer()
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (longPressTriggered.current) {
      e.preventDefault()
      e.stopPropagation()
      longPressTriggered.current = false
      return
    }
    onClick('developer')
  }

  // Keep the parent `.col-actions` (if any) sticky-visible while the picker
  // is open, so the row's hover affordances don't disappear mid-selection.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const colActions = el.closest('.col-actions') as HTMLElement | null
    if (!colActions) return
    if (open) colActions.classList.add('is-sticky-visible')
    else colActions.classList.remove('is-sticky-visible')
    return () => {
      colActions.classList.remove('is-sticky-visible')
    }
  }, [open])

  useEffect(() => () => clearPressTimer(), [])

  const triggerProps = {
    ref: buttonRef,
    type: 'button' as const,
    'aria-label': 'Run Agent',
    title: 'Run Agent',
    style: { touchAction: 'manipulation', userSelect: 'none' } as React.CSSProperties,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUpLike,
    onPointerCancel: handlePointerUpLike,
    onPointerLeave: handlePointerUpLike,
    onClick: handleClick,
    onContextMenu: (e: React.MouseEvent) => {
      if (open) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    draggable: false,
    'data-picker-open': open ? '1' : '0',
  }

  return (
    <>
      <div ref={containerRef} className={cn('no-drag', className)}>
        {triggerClassName ? (
          <button {...triggerProps} className={triggerClassName}>
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
              <IconPlay className="h-4 w-4" />
            </span>
            {label}
          </button>
        ) : (
          <Button {...triggerProps} className={label ? 'btn' : 'btn btn-icon'}>
            <IconPlay />
            {label ? <span className="ml-1">{label}</span> : null}
          </Button>
        )}
      </div>
      {open && containerRef.current && (
        <AgentTypePicker
          anchorEl={containerRef.current}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
