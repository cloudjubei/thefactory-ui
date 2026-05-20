import { describe, expect, it } from 'vitest'
import { buildFileTree, filterFileTree } from './fileTree'

describe('buildFileTree', () => {
  it('returns an empty array for no paths', () => {
    expect(buildFileTree([])).toEqual([])
  })

  it('groups files under their directories', () => {
    const tree = buildFileTree(['src/index.ts', 'src/api/client.ts', 'package.json'])
    expect(tree).toEqual([
      {
        kind: 'dir',
        path: 'src',
        name: 'src',
        children: [
          {
            kind: 'dir',
            path: 'src/api',
            name: 'api',
            children: [{ kind: 'file', path: 'src/api/client.ts', name: 'client.ts' }],
          },
          { kind: 'file', path: 'src/index.ts', name: 'index.ts' },
        ],
      },
      { kind: 'file', path: 'package.json', name: 'package.json' },
    ])
  })

  it('sorts directories before files and each group alphabetically', () => {
    const tree = buildFileTree(['z.md', 'dir/a.ts', 'a.txt', 'dir/b.ts'])
    expect(tree.map((n) => n.name)).toEqual(['dir', 'a.txt', 'z.md'])
    const dir = tree[0]
    if (dir.kind !== 'dir') throw new Error('expected dir')
    expect(dir.children.map((c) => c.name)).toEqual(['a.ts', 'b.ts'])
  })

  it('strips leading slashes from incoming paths', () => {
    const tree = buildFileTree(['/src/x.ts'])
    expect(tree).toEqual([
      {
        kind: 'dir',
        path: 'src',
        name: 'src',
        children: [{ kind: 'file', path: 'src/x.ts', name: 'x.ts' }],
      },
    ])
  })

  it('ignores empty path entries', () => {
    expect(buildFileTree(['', 'a.ts'])).toEqual([{ kind: 'file', path: 'a.ts', name: 'a.ts' }])
  })
})

describe('filterFileTree', () => {
  it('returns all nodes when the query is empty', () => {
    const tree = buildFileTree(['a.ts', 'b/c.ts'])
    expect(filterFileTree(tree, '').length).toBe(2)
    expect(filterFileTree(tree, '   ').length).toBe(2)
  })

  it('keeps files matching the query case-insensitively', () => {
    const tree = buildFileTree(['src/Foo.ts', 'src/bar.ts', 'baz.md'])
    const out = filterFileTree(tree, 'foo')
    expect(out.length).toBe(1)
    if (out[0].kind !== 'dir') throw new Error('expected dir')
    expect(out[0].children.map((c) => c.name)).toEqual(['Foo.ts'])
  })

  it('keeps a directory when its own name matches even if no files do', () => {
    const tree = buildFileTree(['lib/zzz.ts', 'src/foo.ts'])
    const out = filterFileTree(tree, 'lib')
    expect(out.length).toBe(1)
    expect(out[0].name).toBe('lib')
  })

  it('drops directories with no matching descendants and no self match', () => {
    const tree = buildFileTree(['lib/zzz.ts', 'src/foo.ts'])
    expect(filterFileTree(tree, 'foo').map((n) => n.name)).toEqual(['src'])
  })

  it('matches against the full relative path, not just the name', () => {
    const tree = buildFileTree(['src/foo/bar.ts'])
    expect(filterFileTree(tree, 'foo/bar').length).toBe(1)
  })
})
