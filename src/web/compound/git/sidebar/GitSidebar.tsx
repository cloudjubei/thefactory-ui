import { useEffect, useRef, useState, type PointerEvent } from 'react'
import Spinner from '../../../primitives/Spinner'
import { ResizeHandle } from '../../ResizeHandle'
import { IconArchive, IconBranch, IconGlobe } from '../../../icons'
import type { GitStashListItemLike, GitUnifiedBranchLike } from '../types'
import GitSidebarBranchList from './GitSidebarBranchList'
import GitSidebarBranchRow from './GitSidebarBranchRow'
import GitSidebarSectionHeader from './GitSidebarSectionHeader'
import GitSidebarStashRow from './GitSidebarStashRow'

const STORAGE_KEY = 'GitSidebar.widthPx'
const DEFAULT_WIDTH = 280
// Floor the resizable width so the Branches / Remotes / Stashes sections
// always stay comfortably readable — narrower than this the panel is just a
// cramped strip.
const MIN_WIDTH = 240
const SECTIONS_KEY = 'GitSidebar.sectionsOpen'
const FOLDERS_KEY = 'GitSidebar.foldersOpen'

function readStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (!v) return DEFAULT_WIDTH
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? Math.max(MIN_WIDTH, n) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

function persistWidth(px: number) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(px))
  } catch {
    // storage may be disabled (private mode); width stays best-effort
  }
}

type SectionsState = { branches: boolean; remotes: boolean; stashes: boolean }
const DEFAULT_SECTIONS: SectionsState = {
  // First-time default: only Branches is open. Remotes/Stashes start
  // collapsed and stick to whatever the user toggles afterwards.
  branches: true,
  remotes: false,
  stashes: false,
}

function readSections(): SectionsState {
  if (typeof window === 'undefined') return DEFAULT_SECTIONS
  try {
    const raw = window.localStorage.getItem(SECTIONS_KEY)
    if (!raw) return DEFAULT_SECTIONS
    const parsed = JSON.parse(raw)
    return {
      branches: typeof parsed?.branches === 'boolean' ? parsed.branches : DEFAULT_SECTIONS.branches,
      remotes: typeof parsed?.remotes === 'boolean' ? parsed.remotes : DEFAULT_SECTIONS.remotes,
      stashes: typeof parsed?.stashes === 'boolean' ? parsed.stashes : DEFAULT_SECTIONS.stashes,
    }
  } catch {
    return DEFAULT_SECTIONS
  }
}

function persistSections(s: SectionsState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(s))
  } catch {
    // best-effort
  }
}

function readFolders(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(FOLDERS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, boolean> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'boolean') out[k] = v
      }
      return out
    }
    return {}
  } catch {
    return {}
  }
}

function persistFolders(m: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(m))
  } catch {
    // best-effort
  }
}

export type GitSidebarProps = {
  projectId?: string
  loading: boolean
  error?: string
  localBranches: GitUnifiedBranchLike[]
  remoteBranches: GitUnifiedBranchLike[]
  stashes?: GitStashListItemLike[]
  current?: GitUnifiedBranchLike
  selectedBranchName?: string
  selectedStashRef?: string
  onSelectBranch: (b: GitUnifiedBranchLike) => void
  onDoubleClickBranch?: (b: GitUnifiedBranchLike) => void
  onSelectStash: (ref: string) => void
  /**
   * Fill the parent's width and drop the resize handle — for narrow layouts
   * where the sidebar is the full-width master of a master/detail pair.
   */
  fullWidth?: boolean
}

export default function GitSidebar({
  projectId,
  loading,
  error,
  localBranches,
  remoteBranches,
  stashes,
  current,
  selectedBranchName,
  selectedStashRef,
  onSelectBranch,
  onDoubleClickBranch,
  onSelectStash,
  fullWidth = false,
}: GitSidebarProps) {
  const [widthPx, setWidthPx] = useState<number>(() => readStoredWidth())
  const resizeRef = useRef<{ startX: number; startW: number; maxW: number } | null>(null)

  const [sections, setSections] = useState<SectionsState>(() => readSections())
  const [folderOpenMap, setFolderOpenMap] = useState<Record<string, boolean>>(() => readFolders())

  const setSection = (key: keyof SectionsState) => (value: boolean) => {
    setSections((prev) => {
      const next = { ...prev, [key]: value }
      persistSections(next)
      return next
    })
  }

  const setFolderOpen = (folder: string) => (value: boolean) => {
    setFolderOpenMap((prev) => {
      const next = { ...prev, [folder]: value }
      persistFolders(next)
      return next
    })
  }

  useEffect(() => {
    persistWidth(widthPx)
  }, [widthPx])

  const onResizeStart = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const maxW = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.5))
    resizeRef.current = { startX: e.clientX, startW: widthPx, maxW }

    const onMove = (ev: globalThis.PointerEvent) => {
      const st = resizeRef.current
      if (!st) return
      setWidthPx(Math.max(MIN_WIDTH, Math.min(st.maxW, st.startW + ev.clientX - st.startX)))
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Keep width within viewport bounds when the window shrinks.
  useEffect(() => {
    const clamp = () => {
      const maxW = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.5))
      setWidthPx((v) => Math.max(MIN_WIDTH, Math.min(maxW, v)))
    }
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [])

  const otherLocals = localBranches.filter((b) => !b.current)

  return (
    <div
      // `flex-1 min-h-0` lets the sidebar fill the parent's full height so the
      // absolutely-positioned resize handle spans the whole panel even when
      // the branch list is shorter than the available height. Width stays
      // fixed via the inline `style.width` below, so the flex sizing only
      // affects the cross axis. In `fullWidth` mode (narrow master/detail
      // layouts) the panel fills its container and the handle is dropped.
      className={`relative flex-1 min-h-0 flex flex-col pt-1 ${
        fullWidth ? 'w-full' : 'border-r border-(--border-subtle)'
      }`}
      style={fullWidth ? undefined : { width: widthPx }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {!projectId ? (
          <div className="px-3 py-2 text-xs text-(--text-muted)">No active project.</div>
        ) : loading ? (
          <div className="px-3 py-3 flex items-center gap-2 text-xs text-(--text-muted)">
            <Spinner /> Loading…
          </div>
        ) : error ? (
          <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400">Error: {error}</div>
        ) : (
          <div className="flex flex-col pb-3 px-1">
            <GitSidebarSectionHeader
              label="Branches"
              icon={<IconBranch className="w-3.5 h-3.5" />}
              open={sections.branches}
              onToggle={() => setSection('branches')(!sections.branches)}
            />
            {sections.branches && (
              <div className="mb-1">
                {current && (
                  <GitSidebarBranchRow
                    branch={current}
                    isSelected={selectedBranchName === current.name && !selectedStashRef}
                    isRemoteSection={false}
                    onClick={() => onSelectBranch(current)}
                    onDoubleClick={() => onDoubleClickBranch?.(current)}
                  />
                )}
                {!current && localBranches.length === 0 && (
                  <div className="px-3 py-1 text-xs text-(--text-muted)">No local branches.</div>
                )}
                <GitSidebarBranchList
                  branches={otherLocals}
                  isRemoteSection={false}
                  selectedBranchName={selectedBranchName}
                  selectedStashRef={selectedStashRef}
                  folderOpenMap={folderOpenMap}
                  folderKeyPrefix="local"
                  onFolderToggle={setFolderOpen}
                  onSelectBranch={onSelectBranch}
                  onDoubleClickBranch={onDoubleClickBranch}
                />
              </div>
            )}

            <GitSidebarSectionHeader
              label="Remotes"
              icon={<IconGlobe className="w-3.5 h-3.5" />}
              open={sections.remotes}
              onToggle={() => setSection('remotes')(!sections.remotes)}
            />
            {sections.remotes && (
              <div className="mb-1">
                {remoteBranches.length === 0 ? (
                  <div className="px-3 py-1 text-xs text-(--text-muted)">No remote branches.</div>
                ) : (
                  <GitSidebarBranchList
                    branches={remoteBranches}
                    isRemoteSection={true}
                    selectedBranchName={selectedBranchName}
                    selectedStashRef={selectedStashRef}
                    folderOpenMap={folderOpenMap}
                    folderKeyPrefix="remote"
                    onFolderToggle={setFolderOpen}
                    onSelectBranch={onSelectBranch}
                    onDoubleClickBranch={onDoubleClickBranch}
                  />
                )}
              </div>
            )}

            {stashes && stashes.length > 0 && (
              <>
                <GitSidebarSectionHeader
                  label="Stashes"
                  icon={<IconArchive className="w-3.5 h-3.5" />}
                  open={sections.stashes}
                  onToggle={() => setSection('stashes')(!sections.stashes)}
                />
                {sections.stashes && (
                  <div className="flex flex-col gap-0.5 mb-1">
                    {stashes.map((s) => (
                      <GitSidebarStashRow
                        key={s.ref}
                        stash={s}
                        isSelected={selectedStashRef === s.ref}
                        onClick={() => onSelectStash(s.ref)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!fullWidth && (
        <ResizeHandle
          orientation="vertical"
          className="absolute top-0 bottom-0 right-0 z-10 hover:bg-(--surface-muted) transition-colors"
          hitBoxSize={6}
          hideLine
          onResizeStart={onResizeStart}
        />
      )}
    </div>
  )
}
