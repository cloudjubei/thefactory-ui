import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { IconChevron, IconMenu } from '../icons'

export type CollapsibleSidebarItem = {
  id: string
  label: string
  // The icon node. Library makes no assumption about what it is — pass any
  // ReactNode (an SVG icon, a styled span with the project's first letter, etc.)
  icon?: ReactNode
  // CSS hook used by `.nav-item.nav-accent-<accent>` rules in the bundle's
  // layout/nav.css. Defaults to `gray`.
  accent?: string
  badge?: number
  // Trailing slot rendered to the right of the row when expanded — e.g. a
  // small action button.
  action?: ReactNode
}

export type CollapsibleSidebarProps = {
  items: CollapsibleSidebarItem[]
  activeId: string
  onSelect: (id: string) => void
  // localStorage key for collapsed state. Omit to disable persistence.
  storageKey?: string
  headerTitle?: string
  headerSubtitle?: string
  headerAction?: ReactNode
  emptyMessage?: string
  // When provided, the sidebar wraps `children` and exposes an inner main area.
  children?: ReactNode
  sidebarClassName?: string
  // Override the nav body. When provided, replaces the default item list —
  // useful for callers that want richer rendering (sectioning, dividers, ...).
  navContent?: ReactNode
  // Vertical text shown when collapsed in place of the items list.
  collapsedLabel?: string
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const m = window.matchMedia(query)
    const onChange = () => setMatches(m.matches)
    m.addEventListener('change', onChange)
    setMatches(m.matches)
    return () => m.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const MOBILE_DRAWER_WIDTH_PX = 260

export default function CollapsibleSidebar(props: CollapsibleSidebarProps) {
  const { children, sidebarClassName, storageKey, headerTitle, ...rest } = props

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (!storageKey) return false
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  const isMobile = useMediaQuery('(max-width: 768px)')
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
        setTimeout(() => mobileTriggerRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // Bundles every prop SidebarContent reads through to its body. Lets the
  // mobile and desktop branches stay in sync without re-listing each prop.
  const sharedContentProps = { ...rest, storageKey, headerTitle, className: sidebarClassName }

  const sidebar = (
    <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} {...sharedContentProps} />
  )

  if (!children) return sidebar

  if (isMobile) {
    return (
      <div className="flex h-full w-full min-w-0 flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
          <button
            ref={mobileTriggerRef}
            type="button"
            className="nav-trigger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <IconMenu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold">{headerTitle ?? 'Sections'}</div>
        </div>
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-30" style={{ width: MOBILE_DRAWER_WIDTH_PX }}>
              <SidebarContent
                collapsed={false}
                setCollapsed={() => setMobileOpen(false)}
                {...sharedContentProps}
              />
            </div>
          </>
        )}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-w-0">
      {sidebar}
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}

type SidebarContentProps = Omit<CollapsibleSidebarProps, 'children' | 'sidebarClassName'> & {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
  className?: string
}

function SidebarContent({
  collapsed,
  setCollapsed,
  className = '',
  items,
  activeId,
  onSelect,
  storageKey,
  headerTitle,
  headerSubtitle,
  headerAction,
  emptyMessage,
  navContent,
  collapsedLabel,
}: SidebarContentProps) {
  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, collapsed ? '1' : '0')
    } catch {
      // storage may be disabled (private mode, etc.) — collapse state is best-effort
    }
  }, [collapsed, storageKey])

  const activeIndex = useMemo(() => {
    const idx = items.findIndex((n) => n.id === activeId)
    return idx >= 0 ? idx : 0
  }, [items, activeId])

  const [focusIndex, setFocusIndex] = useState<number>(activeIndex)
  useEffect(() => setFocusIndex(activeIndex), [activeIndex])

  const onKeyDownList = useCallback(
    (e: KeyboardEvent) => {
      const max = items.length - 1
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIndex((i) => (i >= max ? 0 : i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIndex((i) => (i <= 0 ? max : i - 1))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setFocusIndex(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setFocusIndex(max)
      }
    },
    [items.length],
  )

  const hasHeaderText =
    !!(headerTitle && headerTitle.trim()) || !!(headerSubtitle && headerSubtitle.trim())

  return (
    <aside
      className={`sidebar relative z-30 flex h-full shrink-0 flex-col border-r bg-(--surface-raised) border-(--border-subtle) ${collapsed ? 'collapsed' : ''} ${className}`}
      aria-label="Navigation"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div
        className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2 pt-3`}
      >
        {!collapsed && hasHeaderText && (
          <div className="px-1">
            <div className="text-sm font-semibold tracking-tight text-(--text-primary)">
              {headerTitle || ''}
            </div>
            <div className="text-[11px] text-(--text-muted)">{headerSubtitle || ''}</div>
          </div>
        )}
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && headerAction}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="nav-toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <IconChevron
              className="w-4 h-4"
              style={{ transform: collapsed ? undefined : 'rotate(90deg)' }}
            />
          </button>
        </div>
      </div>

      <nav className="nav flex-1 min-h-0 overflow-y-auto" onKeyDown={onKeyDownList}>
        {collapsed && collapsedLabel ? (
          <div className="h-full w-full flex items-center justify-center">
            <div
              className="text-[11px] font-semibold tracking-wider text-(--text-muted)"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              aria-label={collapsedLabel}
            >
              {collapsedLabel}
            </div>
          </div>
        ) : (
          navContent || (
            <ul className="nav-list" role="list">
              {items.length === 0 && emptyMessage && (
                <li key="empty" className="nav-li">
                  <div className="text-[11px] text-(--text-muted) px-2 py-1.5">{emptyMessage}</div>
                </li>
              )}
              {items.map((item, i) => {
                const isActive = activeId === item.id
                return (
                  <li key={item.id} className="nav-li">
                    <div className="flex items-center nav-row">
                      <button
                        type="button"
                        className={`nav-item ${isActive ? 'nav-item--active' : ''} ${collapsed ? 'nav-item--compact' : ''} nav-accent-${item.accent ?? 'gray'}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => onSelect(item.id)}
                        title={item.label}
                        tabIndex={focusIndex === i ? 0 : -1}
                        onFocus={() => setFocusIndex(i)}
                      >
                        {item.icon && <span className="nav-item__icon">{item.icon}</span>}
                        {!collapsed && <span className="nav-item__label">{item.label}</span>}
                        {item.badge && item.badge > 0 ? (
                          <span className="nav-item__badge">{item.badge}</span>
                        ) : null}
                      </button>
                      {!collapsed && item.action && (
                        <span className="nav-item__action ml-auto">{item.action}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        )}
      </nav>
    </aside>
  )
}
