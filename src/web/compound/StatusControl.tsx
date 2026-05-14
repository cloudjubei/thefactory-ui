import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/cn'
import type { StoryStatus } from './StoryCard'

/**
 * Story/feature status control — single source of truth for both web and
 * desktop. Renders the shared `.badge.badge--soft.badge--{semantic}` recipe
 * from the package's badges stylesheet and opens a portal-rendered
 * `StatusPicker` when interactive (i.e. `onChange` is provided).
 */

export const STATUS_LABELS: Record<StoryStatus, string> = {
  '+': 'Done',
  '~': 'Crunching',
  '-': 'Pending',
  '?': 'Blocked',
  '=': 'Deferred',
}

export const STATUS_ORDER: StoryStatus[] = ['-', '~', '+', '=', '?']

export type StatusSemanticKey = 'queued' | 'working' | 'done' | 'stuck' | 'onhold'

export function statusKey(s: StoryStatus): StatusSemanticKey {
  switch (s) {
    case '-':
      return 'queued'
    case '~':
      return 'working'
    case '+':
      return 'done'
    case '?':
      return 'stuck'
    case '=':
      return 'onhold'
  }
}

function mapStatusToSemantic(status: StoryStatus | string): {
  key: StatusSemanticKey
  label: string
} {
  switch (status) {
    case '+':
      return { key: 'done', label: 'Done' }
    case '~':
      return { key: 'working', label: 'Crunching' }
    case '-':
      return { key: 'queued', label: 'Pending' }
    case '?':
      return { key: 'stuck', label: 'Blocked' }
    case '=':
      return { key: 'onhold', label: 'Deferred' }
    default:
      return { key: 'queued', label: String(status || '') }
  }
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

/** Sentinel values the picker can emit when the host opts in to extra
 *  filter rows (e.g. an "All" pseudo-status or "Not done"). */
export type StatusPickerValue = StoryStatus | 'all' | 'not-done'

export type StatusPickerProps = {
  anchorEl: HTMLElement
  value: StatusPickerValue
  isAllAllowed?: boolean
  includeNotDone?: boolean
  onSelect: (s: StatusPickerValue) => void
  onClose: () => void
}

export function StatusPicker({
  anchorEl,
  value,
  isAllAllowed = false,
  includeNotDone = false,
  onSelect,
  onClose,
}: StatusPickerProps) {
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

  const [active, setActive] = useState<StatusPickerValue>(value)
  useEffect(() => setActive(value), [value])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!panelRef.current) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      const idx =
        active === 'all' || active === 'not-done'
          ? STATUS_ORDER.length
          : STATUS_ORDER.indexOf(active)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setActive(STATUS_ORDER[(idx + 1) % STATUS_ORDER.length])
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setActive(STATUS_ORDER[(idx - 1 + STATUS_ORDER.length) % STATUS_ORDER.length])
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
      aria-label="Select status"
      style={{ top: coords.top, left: coords.left, minWidth: Math.max(120, coords.minWidth + 8) }}
    >
      {isAllAllowed && (
        <button
          key="all"
          role="menuitemradio"
          aria-checked={value === 'all'}
          className={`standard-picker__item ${active === 'all' ? 'is-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onSelect('all')
          }}
        >
          <span className="status-bullet status-bullet--empty" aria-hidden />
          <span className="standard-picker__label">All</span>
          {value === 'all' && (
            <span className="standard-picker__check" aria-hidden>
              ✓
            </span>
          )}
        </button>
      )}

      {includeNotDone && (
        <button
          key="not-done"
          role="menuitemradio"
          aria-checked={value === 'not-done'}
          className={`standard-picker__item ${active === 'not-done' ? 'is-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onSelect('not-done')
          }}
        >
          <span className="status-bullet status-bullet--queued" aria-hidden />
          <span className="standard-picker__label">Not done</span>
          {value === 'not-done' && (
            <span className="standard-picker__check" aria-hidden>
              ✓
            </span>
          )}
        </button>
      )}

      {STATUS_ORDER.map((s) => {
        const k = statusKey(s)
        const selected = s === value
        const activeItem = s === active
        return (
          <button
            key={s}
            role="menuitemradio"
            aria-checked={selected}
            className={`standard-picker__item ${activeItem ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(s)
            }}
          >
            <span className={`status-bullet status-bullet--${k}`} aria-hidden />
            <span className="standard-picker__label">{STATUS_LABELS[s]}</span>
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

export type StatusControlProps = {
  status: StoryStatus | string
  className?: string
  title?: string
  onChange?: (next: StoryStatus) => void
}

export default function StatusControl({
  status,
  className = '',
  title,
  onChange,
}: StatusControlProps) {
  const { key, label } = mapStatusToSemantic(status)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bulletRef = useRef<HTMLButtonElement>(null)

  const isEditable = !!onChange

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!bulletRef.current) return
      if (document.activeElement === bulletRef.current && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'status-inline max-w-[140px]',
          isEditable && 'editable',
          className,
        )}
      >
        <span
          className={cn(
            'badge badge--soft',
            `badge--${key}`,
            isEditable && 'status-badge--editable',
          )}
          aria-label={`${label} status`}
          title={title || label}
          onClick={(e) => {
            if (isEditable) {
              e.stopPropagation()
              setOpen(true)
            }
          }}
          role={isEditable ? 'button' : undefined}
          tabIndex={isEditable ? 0 : undefined}
        >
          {label}
        </span>
      </div>
      {open && containerRef.current && (
        <StatusPicker
          anchorEl={containerRef.current}
          value={status as StoryStatus}
          onSelect={(s) => {
            onChange?.(s as StoryStatus)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
