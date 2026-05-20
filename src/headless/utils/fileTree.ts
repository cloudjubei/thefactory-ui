/**
 * Client-side tree construction from a flat list of paths. The backend
 * returns files as a flat `string[]` (e.g. `src/api/client.ts`); this turns
 * that into a hierarchical structure the tree view can render. Directories
 * are inferred from the prefix segments.
 *
 * Lifted from thefactory-overseer-web/src/core/files/fileTree.ts so the
 * mobile FileTree native peer can consume the same builder + sort.
 */

export type FileNode = { kind: 'file'; path: string; name: string }
export type DirNode = { kind: 'dir'; path: string; name: string; children: TreeNode[] }
export type TreeNode = FileNode | DirNode

/** Sort directories before files, each group alphabetically by name. */
function sortChildren(children: TreeNode[]): TreeNode[] {
  return [...children].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function buildFileTree(paths: ReadonlyArray<string>): TreeNode[] {
  const root: DirNode = { kind: 'dir', path: '', name: '', children: [] }
  const dirs = new Map<string, DirNode>([['', root]])

  for (const raw of paths) {
    const path = raw.replace(/^\/+/, '')
    if (path.length === 0) continue

    const segments = path.split('/')
    let parent = root
    for (let i = 0; i < segments.length - 1; i++) {
      const dirPath = segments.slice(0, i + 1).join('/')
      let dir = dirs.get(dirPath)
      if (!dir) {
        dir = { kind: 'dir', path: dirPath, name: segments[i], children: [] }
        dirs.set(dirPath, dir)
        parent.children.push(dir)
      }
      parent = dir
    }

    const name = segments[segments.length - 1]
    parent.children.push({ kind: 'file', path, name })
  }

  const recurseSort = (node: DirNode): DirNode => ({
    ...node,
    children: sortChildren(node.children).map((c) => (c.kind === 'dir' ? recurseSort(c) : c)),
  })

  return recurseSort(root).children
}

/**
 * Case-insensitive substring filter over a built tree. A directory is kept
 * if any descendant matches, or if its own `name` / `path` matches.
 */
export function filterFileTree(nodes: ReadonlyArray<TreeNode>, query: string): TreeNode[] {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return [...nodes]

  const out: TreeNode[] = []
  for (const node of nodes) {
    if (node.kind === 'file') {
      if (node.name.toLowerCase().includes(needle) || node.path.toLowerCase().includes(needle)) {
        out.push(node)
      }
      continue
    }
    const filteredChildren = filterFileTree(node.children, needle)
    const selfMatch =
      node.name.toLowerCase().includes(needle) || node.path.toLowerCase().includes(needle)
    if (selfMatch || filteredChildren.length > 0) {
      out.push({ ...node, children: filteredChildren })
    }
  }
  return out
}
