import { useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'

export interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical'
  onResizeStart: (e: PointerEvent<HTMLDivElement>) => void
  /**
   * Pixel offset along the divider for the visible bubble. When omitted, the
   * component tracks the mouse internally — pass an explicit value only if
   * the consumer needs to drive the bubble's position from outside state
   * (e.g. while syncing across split panes).
   */
  handlePos?: number
  onMouseMove?: (e: MouseEvent<HTMLDivElement>) => void
  className?: string
  style?: CSSProperties
  /** Width/height of the hoverable hit-box. Default 10 — big enough to grab without overshooting. */
  hitBoxSize?: number
  /** Pixel offset for centring the divider relative to the parent. */
  offset?: number
  /**
   * Render the grab grip permanently rather than only on hover — for touch /
   * small screens where there is no hover to reveal it. Styled subtly (a
   * background-toned "···" grip) when on.
   */
  alwaysVisible?: boolean
  /**
   * Suppress the built-in 1px divider line — for hosts that already draw
   * their own border at the split (e.g. a panel with `border-r`), so the
   * two lines can't drift apart.
   */
  hideLine?: boolean
}

/**
 * Vertical or horizontal split divider.
 *
 * Two ergonomic affordances make this match desktop:
 *  1. **Pointer capture** — `setPointerCapture` on pointer-down means
 *     the user can drag past the handle's bounding box without losing the
 *     gesture, so wide content underneath the cursor doesn't steal events.
 *  2. **Self-tracking bubble** — when `handlePos` isn't passed, the component
 *     tracks the mouse internally so the visible grab pill always follows
 *     the cursor along the divider axis.
 */
export function ResizeHandle({
  orientation,
  onResizeStart,
  handlePos,
  onMouseMove,
  className = '',
  style,
  hitBoxSize = 10,
  offset = 0,
  alwaysVisible = false,
  hideLine = false,
}: ResizeHandleProps) {
  const isHorizontal = orientation === 'horizontal'

  const [trackedPos, setTrackedPos] = useState<number | null>(null)

  const hasPositioning =
    className.includes('absolute') ||
    className.includes('fixed') ||
    className.includes('relative') ||
    className.includes('sticky')

  const onInternalPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Pointer capture keeps the move events flowing even when the cursor
    // moves over a child element of the host (e.g. an overlapping scrollbar
    // or absolutely-positioned panel). Falls back silently if the browser
    // refuses (Safari sometimes rejects capture on synthetic elements).
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // ignore — drag still works via the window-level move listener consumers attach
    }
    onResizeStart(e)
  }

  const onInternalMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (handlePos === undefined) {
      const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      setTrackedPos(isHorizontal ? e.clientX - r.left : e.clientY - r.top)
    }
    onMouseMove?.(e)
  }

  // Intentionally no mouse-leave handler — the visible bubble fades out via
  // `group-hover` opacity, so we don't need to reset the tracked position.
  // Clearing it caused the bubble to snap back to centre at the end of a
  // drag (the cursor briefly leaves the hit box during the release
  // transition), which the user reported as a visual glitch.

  const effectivePos = handlePos !== undefined ? handlePos : trackedPos

  return (
    <div
      className={`${hasPositioning ? '' : 'relative '}group shrink-0 ${
        isHorizontal ? 'cursor-row-resize' : 'cursor-col-resize'
      } ${className}`}
      style={{
        ...style,
        // The hit area extends beyond the visible 1px divider line so the
        // handle is easy to grab without precise aiming. The visible line
        // and bubble are rendered as absolutely-positioned children below.
        ...(isHorizontal ? { height: hitBoxSize } : { width: hitBoxSize }),
        // Make sure the handle sits above neighbouring panels (graph cells,
        // diff scroller). z-50 on the bubble alone wasn't enough when an
        // ancestor establishes a new stacking context.
        zIndex: 30,
        // Without this, touch devices interpret a drag on the handle as a
        // scroll gesture after a few pixels and stop delivering pointer
        // events — the resize would "stick" partway. `none` keeps the whole
        // gesture ours.
        touchAction: 'none',
      }}
      role="separator"
      aria-orientation={orientation}
      aria-label={`Resize ${orientation}ly`}
      onPointerDown={onInternalPointerDown}
      onMouseMove={onInternalMouseMove}
    >
      {!hideLine && (
        <div
          className={`absolute ${
            isHorizontal
              ? 'inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-neutral-200 dark:bg-neutral-800'
              : 'inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-neutral-200 dark:bg-neutral-800'
          }`}
        />
      )}
      <div
        className={`absolute pointer-events-none ${
          alwaysVisible ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'
        }`}
        style={{
          zIndex: 9999,
          ...(isHorizontal
            ? {
                width: 48,
                height: 8,
                left:
                  effectivePos !== null && effectivePos !== undefined
                    ? effectivePos - 24
                    : `calc(50% - 24px + ${offset}px)`,
                top: '50%',
                transform: 'translateY(-50%)',
              }
            : {
                width: 16,
                height: 48,
                left: '50%',
                transform: 'translateX(-50%)',
                top:
                  effectivePos !== null && effectivePos !== undefined
                    ? effectivePos - 24
                    : `calc(50% - 24px + ${offset}px)`,
              }),
        }}
        aria-hidden
      >
        <div
          className={`h-full w-full rounded border ${
            alwaysVisible
              ? 'border-(--border-subtle) bg-(--surface-muted)'
              : 'border-teal-500 bg-teal-500/20 shadow'
          }`}
        >
          <div className="h-full w-full flex items-center justify-center gap-[3px]">
            {isHorizontal ? (
              alwaysVisible ? (
                <div className="flex items-center gap-[3px]">
                  <span className="w-[3px] h-[3px] rounded-full bg-(--text-muted)" />
                  <span className="w-[3px] h-[3px] rounded-full bg-(--text-muted)" />
                  <span className="w-[3px] h-[3px] rounded-full bg-(--text-muted)" />
                </div>
              ) : (
                <div className="w-[24px] h-[2px] rounded-sm bg-teal-600" />
              )
            ) : (
              <>
                <div
                  className={`w-[2px] h-[24px] rounded-sm ${
                    alwaysVisible ? 'bg-(--text-muted)' : 'bg-teal-600'
                  }`}
                />
                <div
                  className={`w-[2px] h-[24px] rounded-sm ${
                    alwaysVisible ? 'bg-(--text-muted)' : 'bg-teal-600'
                  }`}
                />
                <div
                  className={`w-[2px] h-[24px] rounded-sm ${
                    alwaysVisible ? 'bg-(--text-muted)' : 'bg-teal-600'
                  }`}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
