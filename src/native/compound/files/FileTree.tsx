import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  buildFileTree,
  filterFileTree,
  type DirNode,
  type TreeNode,
} from '../../../headless/utils/fileTree'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

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
}: FileTreeProps) {
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

  const toggleOpen = (path: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  if (displayTree.length === 0) {
    return (
      <View style={{ padding: nativeSpace[3] }}>
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>No files.</Text>
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
      />
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
}: {
  nodes: ReadonlyArray<TreeNode>
  level: number
  openSet: Set<string>
  force: boolean
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggle: (path: string) => void
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
}: {
  node: DirNode
  level: number
  openSet: Set<string>
  force: boolean
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggle: (path: string) => void
}) {
  const open = force || openSet.has(node.path)
  const childCount = node.children.length

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => onToggle(node.path)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 6,
          paddingLeft: indent(level),
          borderRadius: nativeRadii[2],
          backgroundColor: pressed ? nativeLightTheme.surface.hover : 'transparent',
        })}
      >
        <Text style={{ width: 12, color: nativeLightTheme.text.muted, fontSize: 12 }}>
          {open ? '▾' : '▸'}
        </Text>
        <Text style={{ fontSize: 14 }}>{open ? '📂' : '📁'}</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: '500',
            color: nativeLightTheme.text.primary,
          }}
          numberOfLines={1}
        >
          {node.name}
        </Text>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: nativeLightTheme.border.subtle,
            backgroundColor: nativeLightTheme.surface.raised,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: nativeLightTheme.text.muted,
              fontVariant: ['tabular-nums'],
            }}
          >
            {childCount}
          </Text>
        </View>
      </Pressable>
      {open && (
        <Rows
          nodes={node.children}
          level={level + 1}
          openSet={openSet}
          force={force}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggle={onToggle}
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
          ? nativeLightTheme.surface.muted
          : pressed
            ? nativeLightTheme.surface.hover
            : 'transparent',
      })}
    >
      <Text style={{ fontSize: 12 }}>📄</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          color: isSelected ? nativeLightTheme.accent.primary : nativeLightTheme.text.primary,
        }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  )
}

function indent(level: number): number {
  return 6 + level * 16
}
