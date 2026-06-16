import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert as RNAlert, Pressable, Text, TextInput, View } from 'react-native'

import {
  buildFileTree,
  filterFileTree,
  type DirNode,
  type TreeNode,
} from '../../../headless/utils/fileTree'
import {
  IconChevronDown,
  IconChevronRight,
  IconDelete,
  IconDotsVertical,
  IconEdit,
  IconFolder,
  IconFolderOpen,
} from '../../icons'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import ActionMenu, { type ActionMenuItem } from '../ActionMenu'
import FileTypeIcon from './FileTypeIcon'

export type FileTreeEntry = {
  /** Project-relative path, e.g. `src/components/Foo.tsx`. */
  relativePath: string
  /** Optional MIME / extension hint — accepted for parity with web; not
   *  surfaced visually in v1. */
  type?: string | null
}

export type FileTreeProps = {
  files: FileTreeEntry[]
  selectedPath?: string | null
  /** Case-insensitive substring filter against file names + paths. */
  query?: string
  /** Fires when a FILE row is tapped. Folder taps toggle expand only. */
  onSelectFile: (path: string) => void
  /** Folders at depth < `defaultExpandedDepth` start open. Default `0`. */
  defaultExpandedDepth?: number
  /**
   * Fires after the tree filters with the count of visible leaf files. Lets
   * the caller render a live "N files" status that tracks the active filter.
   */
  onVisibleCountChange?: (count: number) => void
  /**
   * When provided, folder rows show a trailing "⋮" button that opens a sheet
   * with a "Rename folder" action. The tree owns the rename dialog and calls
   * this with the folder's old and new project-relative paths on confirm.
   */
  onRenameFolder?: (fromDir: string, toDir: string) => Promise<void> | void
  /**
   * When provided, folder rows show a trailing "⋮" button that opens a sheet
   * with a "Delete folder" action. The tree owns the confirmation and calls
   * this with the folder's project-relative path once the user confirms.
   */
  onDeleteFolder?: (dir: string) => Promise<void> | void
}

function countLeafFiles(nodes: ReadonlyArray<TreeNode>): number {
  let n = 0
  for (const node of nodes) {
    if (node.kind === 'file') n++
    else n += countLeafFiles(node.children)
  }
  return n
}

/**
 * Native peer of [web's `FileTree`](../../../web/compound/files/FileTree.tsx).
 * Renders the flat-path list as an expand/collapse tree using
 * `buildFileTree` from `headless/utils/fileTree.ts` (lifted to be the shared
 * spine). Default-expand seeds + ancestor expand on first `selectedPath`
 * mirror web's behaviour. Query filter delegates to `filterFileTree`.
 *
 * Visual rhythm: row height ~32 px, chevron on dirs, child indent of 16 px
 * per level. Touch targets are pressable rows; no nested Pressables.
 */
export default function FileTree({
  files,
  selectedPath,
  query,
  onSelectFile,
  defaultExpandedDepth = 0,
  onVisibleCountChange,
  onRenameFolder,
  onDeleteFolder,
}: FileTreeProps) {
  const { theme } = useNativeTheme()
  const tree = useMemo(() => buildFileTree(files.map((f) => f.relativePath)), [files])

  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set<string>(['']))

  // Seed expanded depth once when files first arrive. The mount-time
  // `useState` initialiser can't do this because the tree is usually empty
  // on first render (data loads async).
  const didSeedExpandRef = useRef(false)
  useEffect(() => {
    if (didSeedExpandRef.current) return
    if (defaultExpandedDepth <= 0) return
    if (tree.length === 0) return
    didSeedExpandRef.current = true
    setOpenSet((prev) => {
      const next = new Set(prev)
      const seed = (nodes: ReadonlyArray<TreeNode>, depth: number) => {
        if (depth >= defaultExpandedDepth) return
        for (const node of nodes) {
          if (node.kind !== 'dir') continue
          next.add(node.path)
          seed(node.children, depth + 1)
        }
      }
      seed(tree, 0)
      return next
    })
  }, [tree, defaultExpandedDepth])

  // Deep-link affordance: when the tree first mounts with a `selectedPath`,
  // open its ancestor directories so the highlighted row is visible.
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
  const displayTree = useMemo<TreeNode[]>(() => {
    if (!q) return tree
    return filterFileTree(tree, q)
  }, [tree, q])

  // Report the count of visible LEAF files (not directory rows) so the host
  // can render a live "N files" status that tracks the active filter.
  useEffect(() => {
    if (!onVisibleCountChange) return
    onVisibleCountChange(countLeafFiles(displayTree))
  }, [displayTree, onVisibleCountChange])

  const toggleOpen = (path: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  // Folder rename/delete: a trailing "⋮" opens a sheet; rename uses a dialog,
  // delete a native confirm. Mirrors web's `FileTree` owning its own dialogs.
  const [menuDir, setMenuDir] = useState<string | null>(null)
  const [renameDir, setRenameDir] = useState<string | null>(null)
  const folderActionsEnabled = Boolean(onRenameFolder || onDeleteFolder)

  const folderMenuActions: ActionMenuItem[] = []
  if (menuDir) {
    const dir = menuDir
    if (onRenameFolder) {
      folderMenuActions.push({
        key: 'rename',
        label: 'Rename folder',
        icon: <IconEdit size={20} color={theme.text.primary} />,
        onPress: () => {
          setMenuDir(null)
          setRenameDir(dir)
        },
      })
    }
    if (onDeleteFolder) {
      folderMenuActions.push({
        key: 'delete',
        label: 'Delete folder',
        icon: <IconDelete size={20} color="#dc2626" />,
        destructive: true,
        onPress: () => {
          setMenuDir(null)
          RNAlert.alert(
            'Delete folder',
            `Delete "${dir}" and everything inside it? This cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    try {
                      await onDeleteFolder(dir)
                    } catch (err) {
                      RNAlert.alert(
                        'Delete failed',
                        err instanceof Error ? err.message : String(err),
                      )
                    }
                  })()
                },
              },
            ],
          )
        },
      })
    }
  }

  if (displayTree.length === 0) {
    return (
      <View style={{ padding: nativeSpace[3] }}>
        <Text style={{ fontSize: 13, color: theme.text.muted }}>No files.</Text>
      </View>
    )
  }

  return (
    <View accessibilityRole="list">
      <Rows
        nodes={displayTree}
        level={0}
        openSet={openSet}
        force={q.length > 0}
        selectedPath={selectedPath ?? null}
        onSelectFile={onSelectFile}
        onToggle={toggleOpen}
        onShowFolderMenu={folderActionsEnabled ? setMenuDir : undefined}
      />

      <ActionMenu
        isOpen={menuDir !== null}
        onClose={() => setMenuDir(null)}
        title={menuDir ?? undefined}
        actions={folderMenuActions}
      />

      {renameDir !== null && onRenameFolder ? (
        <FolderRenameDialog
          fromDir={renameDir}
          onClose={() => setRenameDir(null)}
          onRename={onRenameFolder}
        />
      ) : null}
    </View>
  )
}

function Rows({
  nodes,
  level,
  openSet,
  force,
  selectedPath,
  onSelectFile,
  onToggle,
  onShowFolderMenu,
}: {
  nodes: ReadonlyArray<TreeNode>
  level: number
  openSet: Set<string>
  force: boolean
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggle: (path: string) => void
  onShowFolderMenu?: (path: string) => void
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.kind === 'dir') {
          return (
            <DirRow
              key={`dir:${node.path}`}
              node={node}
              level={level}
              openSet={openSet}
              force={force}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onToggle={onToggle}
              onShowFolderMenu={onShowFolderMenu}
            />
          )
        }
        return (
          <FileRow
            key={`file:${node.path}`}
            name={node.name}
            path={node.path}
            level={level}
            isSelected={selectedPath === node.path}
            onSelectFile={onSelectFile}
          />
        )
      })}
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
  onShowFolderMenu,
}: {
  node: DirNode
  level: number
  openSet: Set<string>
  force: boolean
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggle: (path: string) => void
  onShowFolderMenu?: (path: string) => void
}) {
  const { theme } = useNativeTheme()
  const open = force || openSet.has(node.path)
  const childCount = node.children.length

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: indent(level) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => onToggle(node.path)}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 6,
            borderRadius: nativeRadii[2],
            backgroundColor: pressed ? theme.surface.hover : 'transparent',
          })}
        >
          <View style={{ width: 12, alignItems: 'center', justifyContent: 'center' }}>
            {open ? (
              <IconChevronDown size={12} color={theme.text.muted} />
            ) : (
              <IconChevronRight size={12} color={theme.text.muted} />
            )}
          </View>
          {open ? <IconFolderOpen size={16} /> : <IconFolder size={16} />}
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: '500',
              color: theme.text.primary,
            }}
            numberOfLines={1}
          >
            {node.name}
          </Text>
        </Pressable>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: theme.text.muted,
              fontVariant: ['tabular-nums'],
            }}
          >
            {childCount}
          </Text>
        </View>
        {onShowFolderMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${node.name}`}
            hitSlop={6}
            onPress={() => onShowFolderMenu(node.path)}
            style={({ pressed }) => ({
              marginLeft: 4,
              padding: 4,
              borderRadius: nativeRadii[2],
              backgroundColor: pressed ? theme.surface.hover : 'transparent',
            })}
          >
            <IconDotsVertical size={16} color={theme.text.muted} />
          </Pressable>
        ) : null}
      </View>
      {open && (
        <Rows
          nodes={node.children}
          level={level + 1}
          openSet={openSet}
          force={force}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggle={onToggle}
          onShowFolderMenu={onShowFolderMenu}
        />
      )}
    </View>
  )
}

function FileRow({
  name,
  path,
  level,
  isSelected,
  onSelectFile,
}: {
  name: string
  path: string
  level: number
  isSelected: boolean
  onSelectFile: (path: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelectFile(path)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 6,
        paddingLeft: indent(level) + 12,
        borderRadius: nativeRadii[2],
        backgroundColor: isSelected
          ? theme.surface.muted
          : pressed
            ? theme.surface.hover
            : 'transparent',
      })}
    >
      <FileTypeIcon path={path} size={16} />
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          color: isSelected ? theme.accent.primary : theme.text.primary,
        }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<TextInput | null>(null)

  const normalized = to.trim().replace(/\/+$/, '')
  const canSubmit = normalized.length > 0 && normalized !== fromDir && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await onRename(fromDir, normalized)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder')
      requestAnimationFrame(() => inputRef.current?.focus())
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Rename folder"
      size="sm"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button onPress={() => void submit()} loading={busy} disabled={!canSubmit}>
            Rename
          </Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[4] }}>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label="New path" hint="Relative to the project root">
          <Input
            ref={inputRef}
            value={to}
            onChangeText={setTo}
            onSubmitEditing={() => void submit()}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            disabled={busy}
          />
        </Field>
      </View>
    </Modal>
  )
}

function indent(level: number): number {
  return 6 + level * 16
}
