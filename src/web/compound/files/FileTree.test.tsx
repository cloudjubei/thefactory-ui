import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FileTree, type FileTreeEntry } from './FileTree'

// Run passive effects during server rendering to exercise the count callback.
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>()
  return { ...react, useEffect: (effect: () => void) => effect() }
})

const entries: FileTreeEntry[] = [
  { relativePath: 'templates/empty', isDir: true },
  { relativePath: 'templates/readme.md', name: 'readme.md' },
  { relativePath: 'templates', isDir: true },
  { relativePath: 'empty-root', isDir: true },
  { relativePath: 'templates/empty', isDir: true },
]

function render(files: FileTreeEntry[], query?: string) {
  return renderToStaticMarkup(
    <FileTree files={files} query={query} onSelectFile={() => {}} onDeleteFolder={() => {}} />,
  )
}

describe('FileTree directory entries', () => {
  it('renders empty directories as folder rows, not selectable files', () => {
    const html = render([{ relativePath: 'empty-root', isDir: true }])
    expect(html).toContain('role="tree"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Delete folder empty-root')
    expect(html).not.toContain('aria-selected=')
    expect(html).not.toContain('No files.')
  })

  it('merges explicit and inferred parents, filters nested empty folders, and avoids duplicate rows', () => {
    for (const files of [entries, [...entries].reverse()]) {
      const html = render(files, 'templates/empty')
      expect(html.match(/title="templates"/g)).toHaveLength(1)
      expect(html.match(/title="empty"/g)).toHaveLength(1)
      expect(html).toContain('Delete folder empty')
      expect(html).not.toContain('readme.md')
      expect(html).not.toContain('aria-selected=')
    }
  })

  it('reports only leaf files, including when a query matches an empty directory', () => {
    const onVisibleCountChange = vi.fn()
    renderToStaticMarkup(
      <FileTree
        files={entries}
        onSelectFile={() => {}}
        onVisibleCountChange={onVisibleCountChange}
      />,
    )
    expect(onVisibleCountChange).toHaveBeenLastCalledWith(1)
    renderToStaticMarkup(
      <FileTree
        files={entries}
        query="templates/empty"
        onSelectFile={() => {}}
        onVisibleCountChange={onVisibleCountChange}
      />,
    )
    expect(onVisibleCountChange).toHaveBeenLastCalledWith(0)
  })

  it('retains legacy file entries and returns the empty state for a nonmatching query', () => {
    expect(render([{ relativePath: 'readme.md' }])).toContain('aria-selected="false"')
    expect(render(entries, 'nothing-matches')).toContain('No files.')
  })
})
