import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../utils/cn'

// Generic time-axis header + Gantt-row pieces. Used by Gantt-style timelines:
// a horizontally scrolling band of dated columns ("units") grouped into larger
// buckets ("header groups", e.g. years over months). Project-agnostic — the
// consumer supplies units / groups; the package renders the chrome.

export type TimeAxisUnit = {
  key: string
  labelTop: string
  labelBottom?: string
}

export type TimeAxisHeaderGroup = {
  label: string
  startIdx: number
  len: number
}

export type TimeAxisHeaderProps = {
  units: TimeAxisUnit[]
  unitCount: number
  headerGroups: TimeAxisHeaderGroup[]
  scrollLeft: number
  totalTimelineWidth: number
  rowHeaderHeightPx: number
  /** Highlights a unit's column when its `key` matches. Common case: today's date in `zoom === 'day'` mode. */
  highlightUnitKey?: string
  className?: string
  style?: CSSProperties
}

export function TimeAxisHeader({
  units,
  unitCount,
  headerGroups,
  scrollLeft,
  totalTimelineWidth,
  rowHeaderHeightPx,
  highlightUnitKey,
  className,
  style,
}: TimeAxisHeaderProps) {
  return (
    <div
      className={cn(
        'shrink-0 w-full overflow-hidden border-b bg-(--surface-raised) border-(--border-default)',
        className,
      )}
      style={style}
    >
      <div className="relative" style={{ height: rowHeaderHeightPx }}>
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: totalTimelineWidth,
            transform: `translateX(${-scrollLeft}px)`,
            willChange: 'transform',
          }}
        >
          {/* Grouping row */}
          <div className="absolute top-0 left-0 w-full flex h-6 border-b border-(--border-subtle)">
            {headerGroups.map((g, idx) => (
              <div
                key={idx}
                className="flex-none px-2 py-1 font-semibold text-[11px] uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap text-(--text-muted)"
                style={{
                  width: `${(g.len / unitCount) * 100}%`,
                  borderLeft: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                {g.label}
              </div>
            ))}
          </div>

          {/* Individual unit columns */}
          <div className="absolute top-6 left-0 w-full flex h-8">
            {units.map((u, i) => {
              const isHighlighted = highlightUnitKey != null && u.key === highlightUnitKey
              return (
                <div
                  key={u.key}
                  className={cn(
                    'flex-none flex flex-col items-center justify-center',
                    isHighlighted
                      ? 'bg-(--color-brand-500)/10 text-(--color-brand-600) font-bold'
                      : 'text-(--text-muted)',
                  )}
                  style={{
                    width: `${(1 / unitCount) * 100}%`,
                    borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div className="text-[11px] leading-tight">{u.labelTop}</div>
                  {u.labelBottom && <div className="text-[9px] opacity-75">{u.labelBottom}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Generic Gantt row — a horizontally scrolling band of cells, one per unit.
// Each cell gets the same fixed width; the consumer renders the cell content
// via the `renderCell` render-prop (typically the items that land on that
// date). The wrapper only handles the cell-grid layout, the optional
// current-unit highlight, and the scroll-syncing transform.

export type TimeAxisRowProps<U extends TimeAxisUnit = TimeAxisUnit> = {
  units: U[]
  totalTimelineWidth: number
  scrollLeft: number
  rowHeightPx: number
  /** Render the contents of the cell at the given unit. The wrapper supplies the cell box. */
  renderCell: (unit: U, index: number, isHighlighted: boolean) => ReactNode
  /** Highlights a unit's column when its `key` matches. */
  highlightUnitKey?: string
  className?: string
  style?: CSSProperties
}

export function TimeAxisRow<U extends TimeAxisUnit = TimeAxisUnit>({
  units,
  totalTimelineWidth,
  scrollLeft,
  rowHeightPx,
  renderCell,
  highlightUnitKey,
  className,
  style,
}: TimeAxisRowProps<U>) {
  const unitCount = units.length
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ height: rowHeightPx, ...style }}
    >
      <div
        className="absolute top-0 left-0 h-full flex"
        style={{
          width: totalTimelineWidth,
          transform: `translateX(${-scrollLeft}px)`,
          willChange: 'transform',
        }}
      >
        {units.map((u, i) => {
          const isHighlighted = highlightUnitKey != null && u.key === highlightUnitKey
          return (
            <div
              key={u.key}
              className={cn(
                'flex-none h-full',
                isHighlighted && 'bg-(--color-brand-500)/5',
              )}
              style={{
                width: `${(1 / unitCount) * 100}%`,
                borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              {renderCell(u, i, isHighlighted)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
