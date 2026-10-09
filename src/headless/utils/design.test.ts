import { describe, expect, it } from 'vitest'
import type { DesignItem, DesignScreenTree, DesignTree } from '../api'
import {
  approvedDesignItem,
  designItemContentUrl,
  designItemMediaType,
  designItemViewKind,
  designScreenItems,
  findDesignItem,
  findDesignScreen,
  referenceDesignOf,
  storageUsageFraction,
} from './design'

const SHA = 'a'.repeat(64)
const item = (over: Partial<DesignItem>): DesignItem => ({
  id: 'i1',
  screenId: 's1',
  kind: 'design',
  name: 'mock.png',
  source: { type: 'blob', sha256: SHA, mediaType: 'image/png', bytes: 4, originalName: 'mock.png' },
  addedBy: { by: 'person' },
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const screen: DesignScreenTree = {
  id: 's1',
  appId: 'a1',
  name: 'Login',
  createdAt: 1,
  updatedAt: 1,
  items: [
    item({}),
    item({ id: 'i2', name: 'v2', approved: true, createdAt: 2 }),
    item({ id: 'b1', kind: 'built', name: 'Run 1', createdAt: 3 }),
    item({ id: 'b2', kind: 'built', name: 'Run 2', createdAt: 5 }),
  ],
}
const tree: DesignTree = {
  apps: [
    { id: 'a1', name: 'Android', kind: 'product', createdAt: 1, updatedAt: 1, screens: [screen] },
  ],
}

describe('referenceDesignOf', () => {
  it('keeps what the & dropdown and the chips need: names, kinds and the approved draft', () => {
    expect(referenceDesignOf(tree)).toEqual({
      apps: [{ id: 'a1', name: 'Android' }],
      screens: [{ id: 's1', appId: 'a1', name: 'Login' }],
      items: [
        { id: 'i1', screenId: 's1', name: 'mock.png', kind: 'design' },
        { id: 'i2', screenId: 's1', name: 'v2', kind: 'design', approved: true },
        { id: 'b1', screenId: 's1', name: 'Run 1', kind: 'built' },
        { id: 'b2', screenId: 's1', name: 'Run 2', kind: 'built' },
      ],
    })
  })
})

describe('finding in a design', () => {
  it('finds a screen and an item with what they belong to', () => {
    expect(findDesignScreen(tree, 's1')).toMatchObject({ app: { id: 'a1' }, screen: { id: 's1' } })
    expect(findDesignItem(tree, 'b2')).toMatchObject({
      app: { id: 'a1' },
      screen: { id: 's1' },
      item: { name: 'Run 2' },
    })
    expect(findDesignScreen(tree, 'nope')).toBeUndefined()
    expect(findDesignItem(tree, 'nope')).toBeUndefined()
  })

  it('splits a screen into its drafts, in the order added, and its built versions, newest first', () => {
    const { designs, built } = designScreenItems(screen)
    expect(designs.map((i) => i.id)).toEqual(['i1', 'i2'])
    expect(built.map((i) => i.id)).toEqual(['b2', 'b1'])
    expect(approvedDesignItem(screen)?.id).toBe('i2')
    expect(approvedDesignItem({ ...screen, items: [item({})] })).toBeUndefined()
  })
})

describe('designItemContentUrl', () => {
  it('is the item’s content route, with a view token for an <img> or <iframe>', () => {
    expect(designItemContentUrl('http://localhost:3000/', 'p 1', 'i/1')).toBe(
      'http://localhost:3000/api/v1/projects/p%201/design/items/i%2F1/content',
    )
    expect(designItemContentUrl('http://h', 'p1', 'i1', 'a.b+c')).toBe(
      'http://h/api/v1/projects/p1/design/items/i1/content?viewToken=a.b%2Bc',
    )
  })
})

describe('designItemViewKind', () => {
  it('says how a viewer shows each item, whatever its file', () => {
    const blob = (name: string, mediaType: string) =>
      item({ source: { type: 'blob', sha256: SHA, mediaType, bytes: 1, originalName: name } })
    expect(designItemViewKind(blob('a.png', 'image/png'))).toBe('image')
    expect(designItemViewKind(blob('a.svg', 'image/svg+xml'))).toBe('html')
    expect(designItemViewKind(blob('a.html', 'text/html'))).toBe('html')
    expect(designItemViewKind(blob('a.pdf', 'application/pdf'))).toBe('pdf')
    expect(designItemViewKind(blob('a.mp4', 'video/mp4'))).toBe('video')
    expect(designItemViewKind(blob('a.md', 'text/markdown'))).toBe('text')
    expect(designItemViewKind(blob('a.fig', 'application/octet-stream'))).toBe('file')
    expect(designItemViewKind(item({ source: { type: 'link', url: 'https://x.io' } }))).toBe('link')
    expect(designItemViewKind(item({ source: { type: 'project-file', path: 'docs/A.JPG' } }))).toBe(
      'image',
    )
    expect(
      designItemMediaType(item({ source: { type: 'project-file', path: 'docs/a.psd' } })),
    ).toBe('image/vnd.adobe.photoshop')
    expect(
      designItemMediaType(item({ source: { type: 'link', url: 'https://x.io' } })),
    ).toBeUndefined()
  })
})

describe('storageUsageFraction', () => {
  it('is how far the total is toward the warning threshold', () => {
    expect(storageUsageFraction({ totalBytes: 50, thresholdBytes: 200, over: false })).toBe(0.25)
    expect(storageUsageFraction({ totalBytes: 300, thresholdBytes: 200, over: true })).toBe(1.5)
    expect(storageUsageFraction({ totalBytes: 1, thresholdBytes: 0, over: true })).toBe(1)
  })
})
