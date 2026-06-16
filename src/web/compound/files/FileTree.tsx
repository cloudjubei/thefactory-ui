import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { IconChevron, IconDelete, IconEdit, IconFolder, IconFolderOpen } from '../../icons'
import { FileTypeIcon } from './FileTypeIcon'

function countLeafFiles(node: DirNode): number {
  let n = node.files.length
  for (const d of node.dirs) n += countLeafFiles(d)
  return n
}

export type FileTreeEntry = {
  /** Project-relative path, e.g. `src/components/Foo.tsx`. */
  relativePath: string
  /** File basename (`Foo.tsx`). Falls back to the last `/`-segment. */
  name?: string
  /** Optional MIME / extension hint. Falls back to extension parsing. */
  type?: string | null
}

export type FileTreeProps = {
  files: FileTreeEntry[]
  selectedPath?: string | null
  /** Case-insensitive substring filter against name + relativePath. */
  query?: string
  /** Fires when a FILE row is clicked. Folder clicks toggle expand only. */
  onSelectFile: (path: string) => void
  /** Folders at depth < `defaultExpandedDepth` start open. Default: 0 (all closed). */
  defaultExpandedDepth?: number
  /** Optional className for the outermost `<ul>`. */
  className?: string
  /**
   * Fires after the tree filters with the count of visible leaf files. Lets
   * the caller render a live "N files" status that tracks the active filter.
   */
  onVisibleCountChange?: (count: number) => void
  /**
   * When provided, folder rows reveal a "rename" action on hover (left of the
   * child-count badge). The tree owns the rename dialog and calls this with
   * the folder's old and new project-relative paths on confirm.
   */
  onRenameFolder?: (fromDir: string, toDir: string) => Promise<void> | void
  /**
   * When provided, folder rows reveal a "delete" action on hover (left of the
   * child-count badge). The tree owns the confirmation dialog and calls this
   * with the folder's project-relative path once the user confirms.
   */
  onDeleteFolder?: (dir: string) => Promise<void> | void
}

type DirNode = {
  kind: 'dir'
  name: string
  relPath: string // '' for root
  dirs: DirNode[]
  files: FileNode[]
}

type FileNode = {
  kind: 'file'
  name: string
  relPath: string
  type?: string | null
}

function buildTree(entries: FileTreeEntry[]): DirNode {
  const root: DirNode = { kind: 'dir', name: '', relPath: '', dirs: [], files: [] }
  for (const entry of entries) {
    const parts = entry.relativePath.split('/').filter(Boolean)
    if (parts.length === 0) continue
    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i]
      const childRel = parts.slice(0, i + 1).join('/')
      let next = cur.dirs.find((d) => d.name === segment)
      if (!next) {
        next = { kind: 'dir', name: segment, relPath: childRel, dirs: [], files: [] }
        cur.dirs.push(next)
      }
      cur = next
    }
    const leafName = entry.name ?? parts[parts.length - 1]
    cur.files.push({
      kind: 'file',
      name: leafName,
      relPath: entry.relativePath,
      type: entry.type ?? null,
    })
  }
  sortDir(root)
  return root
}

function sortDir(dir: DirNode) {
  dir.dirs.sort((a, b) => a.name.localeCompare(b.name))
  dir.files.sort((a, b) => a.name.localeCompare(b.name))
  for (const d of dir.dirs) sortDir(d)
}

function filterDir(node: DirNode, q: string): DirNode | null {
  const needle = q.toLowerCase()
  const filteredDirs: DirNode[] = []
  for (const d of node.dirs) {
    const fd = filterDir(d, q)
    if (fd) filteredDirs.push(fd)
  }
  const filteredFiles = node.files.filter(
    (f) => f.name.toLowerCase().includes(needle) || f.relPath.toLowerCase().includes(needle),
  )
  const selfMatch =
    node.relPath.length > 0 &&
    (node.name.toLowerCase().includes(needle) || node.relPath.toLowerCase().includes(needle))
  if (selfMatch || filteredDirs.length > 0 || filteredFiles.length > 0) {
    return { ...node, dirs: filteredDirs, files: filteredFiles }
  }
  return null
}

export function FileTree({
  files,
  selectedPath,
  query,
  onSelectFile,
  defaultExpandedDepth = 0,
  className,
  onVisibleCountChange,
  onRenameFolder,
  onDeleteFolder,
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files])

  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set<string>(['']))

  // Seed the default-expanded depth once, when files first arrive. The
  // `useState` initialiser above can't do this because on first mount the
  // `files` prop is usually empty (data loads async) — the `tree` it would
  // walk is empty, so the seed produces nothing. Run it after the first
  // non-empty tree.
  const didSeedExpandRef = useRef(false)
  useEffect(() => {
    if (didSeedExpandRef.current) return
    if (defaultExpandedDepth <= 0) return
    if (tree.dirs.length === 0) return
    didSeedExpandRef.current = true
    setOpenSet((prev) => {
      const next = new Set(prev)
      const seed = (node: DirNode, depth: number) => {
        if (depth >= defaultExpandedDepth) return
        for (const child of node.dirs) {
          next.add(child.relPath)
          seed(child, depth + 1)
        }
      }
      seed(tree, 0)
      return next
    })
  }, [tree, defaultExpandedDepth])

  // Deep-link / initial-mount affordance: when the tree first mounts with a
  // selectedPath, expand its ancestors so the highlighted row is visible.
  // Subsequent `selectedPath` changes intentionally leave `openSet` alone —
  // a folder the user explicitly collapsed should stay collapsed even if the
  // next selection happens to live underneath it (e.g. via URL navigation).
  const didInitialExpandRef = useRef(false)
  useEffect(() => {
    if (didInitialExpandRef.current) return
    if (!selectedPath) return
    didInitialExpandRef.current = true
    const parts = selectedPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    setOpenSet((prev) => {
      const next = new Set(prev)
      for (let i = 0; i < parts.length - 1; i++) {
        next.add(parts.slice(0, i + 1).join('/'))
      }
      return next
    })
  }, [selectedPath])

  const q = (query ?? '').trim()
  const displayTree = useMemo<DirNode>(() => {
    if (!q) return tree
    return filterDir(tree, q) ?? { ...tree, dirs: [], files: [] }
  }, [tree, q])

  // Report the count of visible LEAF files (not directory rows) so the host
  // can render a live "N files" status that tracks the active filter.
  useEffect(() => {
    if (!onVisibleCountChange) return
    onVisibleCountChange(countLeafFiles(displayTree))
  }, [displayTree, onVisibleCountChange])

  const toggleOpen = (relPath: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(relPath)) next.delete(relPath)
      else next.add(relPath)
      return next
    })

  // Folder rename/delete dialogs are owned here (mirroring `FilePane`) so both
  // host apps only wire the mutations, not duplicate dialog chrome.
  const [folderAction, setFolderAction] = useState<{
    kind: 'rename' | 'delete'
    relPath: string
  } | null>(null)

  if (displayTree.dirs.length === 0 && displayTree.files.length === 0) {
    return <div className="text-sm opacity-60 p-3">No files.</div>
  }

  return (
    <>
      <ul role="tree" className={className ?? 'text-sm'}>
        <DirChildren
          node={displayTree}
          level={0}
          openSet={openSet}
          force={Boolean(q)}
          selectedPath={selectedPath ?? null}
          onSelectFile={onSelectFile}
          onToggle={toggleOpen}
          onRenameFolder={
            onRenameFolder ? (relPath) => setFolderAction({ kind: 'rename', relPath }) : undefined
          }
          onDeleteFolder={
            onDeleteFolder ? (relPath) => setFolderAction({ kind: 'delete', relPath }) : undefined
          }
        />
      </ul>

      {folderAction?.kind === 'rename' && onRenameFolder && (
        <FolderRenameDialog
          fromDir={folderAction.relPath}
          onClose={() => setFolderAction(null)}
          onRename={onRenameFolder}
        />
      )}

      {folderAction?.kind === 'delete' && onDeleteFolder && (
        <FolderDeleteDialog
          dir={folderAction.relPath}
          onClose={() => setFolderAction(null)}
          onDelete={onDeleteFolder}
        />
      )}
    </>
  )
}

function DirChildren({
  node,
  level,
  openSet,
  force,
  selectedPath,
  onSelectFile,
  onToggle,
  onRenameFolder,
  onDeleteFolder,
}: {
  node: DirNode
  level: number
  openSet: Set<string>
  force: boolean
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggle: (relPath: string) => void
  onRenameFolder?: (relPath: string) => void
  onDeleteFolder?: (relPath: string) => void
}) {
  return (
    <>
      {node.dirs.map((d) => (
        <DirRow
          key={`dir:${d.relPath}`}
          node={d}
          level={level}
          openSet={openSet}
          force={force}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggle={onToggle}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
      {node.files.map((f) => (
        <FileRow
          key={`file:${f.relPath}`}
          node={f}
          level={level}
          isSelected={selectedPath === f.relPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </>
  )
}

function DirRow({
  node,
  level,
  openSet,
  force,
  selectedPath,
  onSelectFile,
  onToggle,
  onRenameFolder,
  onDeleteFolder,
}: {
  node: DirNode
  level: number
  openSet: Set<string>
  force: boolean
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggle: (relPath: string) => void
  onRenameFolder?: (relPath: string) => void
  onDeleteFolder?: (relPath: string) => void
}) {
  const open = force || openSet.has(node.relPath)
  const directChildren = node.dirs.length + node.files.length

  return (
    <li role="treeitem" aria-expanded={open}>
      <div
        className="group w-full flex items-center gap-1.5 py-1 px-1 rounded-md hover:bg-(--surface-hover)"
        style={{ paddingLeft: indent(level) }}
      >
        <button
          type="button"
          onClick={() => onToggle(node.relPath)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={node.name}
        >
          <IconChevron
            className="w-3 h-3 shrink-0 opacity-70"
            style={{ transform: open ? 'rotate(90deg)' : undefined }}
          />
          {open ? (
            <IconFolderOpen className="w-4 h-4 shrink-0" />
          ) : (
            <IconFolder className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {(onRenameFolder || onDeleteFolder) && (
          <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            {onRenameFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRenameFolder(node.relPath)
                }}
                className="inline-flex items-center justify-center rounded p-1 text-(--text-muted) hover:bg-(--surface-muted) hover:text-(--text-primary)"
                aria-label={`Rename folder ${node.name}`}
                title="Rename folder"
              >
                <IconEdit className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteFolder(node.relPath)
                }}
                className="inline-flex items-center justify-center rounded p-1 text-red-600 hover:bg-(--surface-muted) hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label={`Delete folder ${node.name}`}
                title="Delete folder"
              >
                <IconDelete className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        )}
        <span
          className="ml-auto rounded-full border px-1.5 py-px text-[10px] tabular-nums"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
            background: 'var(--surface-raised)',
          }}
        >
          {directChildren}
        </span>
      </div>
      {open && (
        <ul role="group">
          <DirChildren
            node={node}
            level={level + 1}
            openSet={openSet}
            force={force}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
            onToggle={onToggle}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        </ul>
      )}
    </li>
  )
}

function FileRow({
  node,
  level,
  isSelected,
  onSelectFile,
}: {
  node: FileNode
  level: number
  isSelected: boolean
  onSelectFile: (path: string) => void
}) {
  const style: CSSProperties = {
    paddingLeft: indent(level) + 12,
    background: isSelected ? 'var(--color-brand-50)' : undefined,
    color: isSelected ? 'var(--color-brand-700)' : undefined,
  }
  return (
    <li role="treeitem" aria-selected={isSelected}>
      <button
        type="button"
        onClick={() => onSelectFile(node.relPath)}
        className="w-full text-left flex items-center gap-1.5 py-1 px-1 rounded-md hover:bg-(--surface-hover)"
        style={style}
        title={node.name}
        aria-current={isSelected ? 'true' : undefined}
      >
        <FileTypeIcon
          name={node.name}
          type={node.type ?? undefined}
          size={14}
          className="shrink-0"
        />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  )
}

function FolderRenameDialog({
  fromDir,
  onClose,
  onRename,
}: {
  fromDir: string
  onClose: () => void
  onRename: (fromDir: string, toDir: string) => Promise<void> | void
}) {
  const [to, setTo] = useState(fromDir)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalized = to.trim().replace(/\/+$/, '')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (normalized.length === 0 || normalized === fromDir || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onRename(fromDir, normalized)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Rename folder">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="New path" hint="Relative to the project root">
          <Input autoFocus value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={normalized.length === 0 || normalized === fromDir}
          >
            Rename
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function FolderDeleteDialog({
  dir,
  onClose,
  onDelete,
}: {
  dir: string
  onClose: () => void
  onDelete: (dir: string) => Promise<void> | void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onDelete(dir)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Delete folder" size="sm">
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Delete <span className="font-medium">&quot;{dir}&quot;</span> and everything inside it?
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={onConfirm} loading={submitting}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function indent(depth: number): number {
  return 6 + depth * 14
}

export default FileTree
