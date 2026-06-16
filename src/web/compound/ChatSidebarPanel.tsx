import React, { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { ResizeHandle } from './ResizeHandle'
import { IconChat, IconChevron } from '../icons'

export type ChatSidebarPanelChildrenArgs = {
  collapsed: boolean
  setCollapsed: (next: boolean) => void
  width: number
}

export type ChatSidebarPanelProps = {
  isOpen?: boolean
  initialWidth?: number
  onWidthChange?: (width: number, isFinal: boolean) => void
  defaultCollapsed?: boolean
  /** Controlled collapsed state. When provided, the panel is controlled and `onCollapsedChange` reports requests. */
  collapsed?: boolean
  /** Called whenever the panel requests a collapsed-state change (expand button, header collapse). */
  onCollapsedChange?: (next: boolean) => void
  collapsedTitle?: string
  collapsedAriaLabel?: string
  expandedAriaLabel?: string
  /**
   * Render the panel as attached to a dialog/modal (vs docked to the screen
   * edge): rounds the outer (right) corners to match the dialog, and shows
   * only the single chat-icon button when collapsed.
   */
  attached?: boolean
  children: ReactNode | ((args: ChatSidebarPanelChildrenArgs) => ReactNode)
}

function getMetricPx(name: string, fallback: number) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name)
    const n = parseInt(v.trim().replace('px', ''), 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  } catch {
    return fallback
  }
}

export function ChatSidebarPanel({
  isOpen = true,
  initialWidth = 380,
  onWidthChange,
  defaultCollapsed = true,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  collapsedTitle,
  collapsedAriaLabel = 'Open chat',
  expandedAriaLabel = 'Chat sidebar',
  attached = false,
  children,
}: ChatSidebarPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const collapsed = controlledCollapsed ?? internalCollapsed
  const setCollapsed = (next: boolean) => {
    setInternalCollapsed(next)
    onCollapsedChange?.(next)
  }

  if (!isOpen) return null

  const MIN_W = getMetricPx('--sidebar-w', 260)
  const COLLAPSED_W = getMetricPx('--sidebar-w-collapsed', 64)

  const [width, setWidth] = useState<number>(() => {
    const maxByViewport = Math.floor(window.innerWidth * 0.5)
    return Math.max(MIN_W, Math.min(maxByViewport, initialWidth))
  })
  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onResizeMove)
      window.removeEventListener('pointerup', onResizeEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    resizingRef.current = { startX: e.clientX, startWidth: width }
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', onResizeEnd)
  }

  const onResizeMove = (e: PointerEvent) => {
    if (!resizingRef.current) return
    const { startX, startWidth } = resizingRef.current
    const dx = e.clientX - startX
    const next = startWidth - dx
    const maxByViewport = Math.floor(window.innerWidth * 0.5)
    const clamped = Math.max(MIN_W, Math.min(maxByViewport, next))
    setWidth(clamped)
    onWidthChange?.(clamped, false)
  }

  const onResizeEnd = (_e: PointerEvent) => {
    resizingRef.current = null
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
    onWidthChange?.(width, true)
  }

  const transitionInOut = '200ms cubic-bezier(0.2, 0.8, 0.2, 1)'
  const effectiveWidth = collapsed ? COLLAPSED_W : width

  if (collapsed) {
    return (
      <aside
        className={`chat-collapsed-panel z-30 h-full bg-white dark:bg-neutral-900 border-l dark:border-neutral-800 collapsed${
          attached ? ' rounded-r-lg' : ''
        }`}
        style={{ width: COLLAPSED_W }}
      >
        {attached ? (
          <div className="top" />
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="btn-secondary btn-icon top"
            aria-label="Expand chat sidebar"
            title="Expand chat sidebar"
          >
            <IconChevron className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
        <button
          type="button"
          className="btn-secondary btn-icon center"
          onClick={() => setCollapsed(false)}
          aria-label={collapsedAriaLabel}
          title={collapsedTitle ?? collapsedAriaLabel}
        >
          <IconChat className="w-5 h-5" />
        </button>
        <div className="bottom"></div>
      </aside>
    )
  }

  const outerStyle: CSSProperties = {
    width: effectiveWidth,
    transition: `width ${transitionInOut}`,
    background: 'var(--surface-base)',
    position: 'relative',
    overflow: 'visible',
  }

  const innerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
  }

  const body =
    typeof children === 'function'
      ? (children as (args: ChatSidebarPanelChildrenArgs) => ReactNode)({
          collapsed,
          setCollapsed,
          width,
        })
      : children

  return (
    <div
      className={`h-full border-l dark:border-neutral-800${attached ? ' rounded-r-lg' : ''}`}
      style={outerStyle}
      role="complementary"
      aria-label={expandedAriaLabel}
    >
      <ResizeHandle
        orientation="vertical"
        className="absolute left-0 top-0 bottom-0 z-10"
        hitBoxSize={20}
        onResizeStart={onResizeStart}
      />

      <div style={innerStyle}>{body}</div>
    </div>
  )
}

export default ChatSidebarPanel
