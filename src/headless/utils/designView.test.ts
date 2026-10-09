import { describe, expect, it } from 'vitest'
import type { DesignItem, DesignScreenTree, DesignTree } from '../api'
import {
  designCompareBaseline,
  designDeleteSummary,
  designDiscussDraft,
  designItemAddedByLabel,
  designItemFileName,
  designPreviewItem,
  designReferencePreview,
  designSelection,
  storageUsageBreakdown,
  storageUsageSummary,
  storageWarningNotification,
} from './designView'
import { STORAGE_WARNING_TEXT } from './designViewConstants'

const SHA = 'a'.repeat(64)
const MB = 1024 * 1024
const GB = 1024 * MB

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

const screenOf = (id: string, items: DesignItem[], appId = 'a1'): DesignScreenTree => ({
  id,
  appId,
  name: `Screen ${id}`,
  createdAt: 1,
  updatedAt: 1,
  items: items.map((i) => ({ ...i, screenId: id })),
})

const html = item({
  id: 'h1',
  name: 'mock.html',
  source: { type: 'project-file', path: 'design/mock.html' },
})

const login = screenOf('s1', [
  item({ id: 'd1' }),
  item({ id: 'd2', approved: true, createdAt: 2 }),
  item({ id: 'b1', kind: 'built', createdAt: 3 }),
  item({ id: 'b2', kind: 'built', createdAt: 5 }),
  item({ id: 'b3', kind: 'built', createdAt: 4 }),
])
const empty = screenOf('s2', [])

const tree: DesignTree = {
  apps: [
    { id: 'a0', name: 'Web', kind: 'product', createdAt: 1, updatedAt: 1, screens: [] },
    {
      id: 'a1',
      name: 'Android',
      kind: 'product',
      createdAt: 1,
      updatedAt: 1,
      screens: [login, empty],
    },
  ],
}

describe('designSelection', () => {
  it('opens the item a link names, on its own screen, even when the screen is not named', () => {
    expect(designSelection(tree, { item: 'b2' })).toEqual({ screenId: 's1', itemId: 'b2' })
  })

  it('goes by the item over a screen it is not on', () => {
    expect(designSelection(tree, { screen: 's2', item: 'b2' })).toEqual({
      screenId: 's1',
      itemId: 'b2',
    })
  })

  it('selects the screen a link names and opens nothing', () => {
    expect(designSelection(tree, { screen: 's2' })).toEqual({ screenId: 's2' })
  })

  it('falls back to the first screen when what the link names is gone', () => {
    expect(designSelection(tree, { screen: 'gone', item: 'gone' })).toEqual({ screenId: 's1' })
  })

  it('selects the first screen of the first app that has one', () => {
    expect(designSelection(tree, {})).toEqual({ screenId: 's1' })
  })

  it('selects nothing in a design with no screens', () => {
    expect(designSelection({ apps: [] }, { screen: 's1' })).toEqual({})
    expect(designSelection({ apps: [tree.apps[0]!] }, {})).toEqual({})
  })
})

describe('designPreviewItem', () => {
  it('shows a screen by its approved design', () => {
    expect(designPreviewItem(login)?.id).toBe('d2')
  })

  it('shows the latest built version when no draft is approved', () => {
    const unapproved = screenOf('s3', [
      item({ id: 'd1' }),
      item({ id: 'b1', kind: 'built', createdAt: 3 }),
      item({ id: 'b2', kind: 'built', createdAt: 9 }),
    ])
    expect(designPreviewItem(unapproved)?.id).toBe('b2')
  })

  it('has nothing to show for a screen with only unapproved drafts, or nothing', () => {
    expect(designPreviewItem(screenOf('s3', [item({ id: 'd1' })]))).toBeUndefined()
    expect(designPreviewItem(empty)).toBeUndefined()
  })
})

describe('designReferencePreview', () => {
  it('previews the item a link names', () => {
    expect(designReferencePreview(tree, { screenId: 's1', itemId: 'b1' })?.id).toBe('b1')
  })

  it('previews a screen link by what the screen shows', () => {
    expect(designReferencePreview(tree, { screenId: 's1' })?.id).toBe('d2')
  })

  it('previews nothing for a link to what is gone', () => {
    expect(designReferencePreview(tree, { screenId: 's1', itemId: 'gone' })).toBeUndefined()
    expect(designReferencePreview(tree, { screenId: 'gone' })).toBeUndefined()
    expect(designReferencePreview(tree, {})).toBeUndefined()
  })
})

describe('designCompareBaseline', () => {
  it('compares a built version with the approved design when that is an image', () => {
    expect(designCompareBaseline(login, 'b3')).toEqual({
      item: expect.objectContaining({ id: 'd2' }),
      label: 'Approved design',
    })
  })

  it('compares with the built version before it when the approved design is not an image', () => {
    const screen = screenOf('s3', [
      { ...html, approved: true },
      item({ id: 'b1', kind: 'built', createdAt: 3 }),
      item({ id: 'b2', kind: 'built', createdAt: 5 }),
    ])
    expect(designCompareBaseline(screen, 'b2')).toEqual({
      item: expect.objectContaining({ id: 'b1' }),
      label: 'Previous built version',
    })
  })

  it('compares with the built version before it when no draft is approved', () => {
    const screen = screenOf('s3', [
      item({ id: 'b1', kind: 'built', createdAt: 3 }),
      item({ id: 'b2', kind: 'built', createdAt: 5 }),
      item({ id: 'b0', kind: 'built', createdAt: 1 }),
    ])
    expect(designCompareBaseline(screen, 'b1')?.item.id).toBe('b0')
  })

  it('has nothing to compare the oldest built version with, nor a draft, nor what is gone', () => {
    const screen = screenOf('s3', [
      item({ id: 'd1' }),
      item({ id: 'b1', kind: 'built', createdAt: 3 }),
    ])
    expect(designCompareBaseline(screen, 'b1')).toBeUndefined()
    expect(designCompareBaseline(login, 'd1')).toBeUndefined()
    expect(designCompareBaseline(login, 'gone')).toBeUndefined()
  })
})

describe('designDeleteSummary', () => {
  it('says how many screens and items go with an app', () => {
    expect(designDeleteSummary({ kind: 'app', app: tree.apps[1]! })).toBe(
      'Delete “Android”? Its 2 screens and 5 items go with it.',
    )
  })

  it('counts one of each in the singular', () => {
    const app = { ...tree.apps[1]!, screens: [screenOf('s9', [item({})])] }
    expect(designDeleteSummary({ kind: 'app', app })).toBe(
      'Delete “Android”? Its 1 screen and 1 item go with it.',
    )
  })

  it('says how many items go with a screen', () => {
    expect(designDeleteSummary({ kind: 'screen', screen: login })).toBe(
      'Delete “Screen s1”? Its 5 items go with it.',
    )
  })

  it('says when nothing goes with it', () => {
    expect(designDeleteSummary({ kind: 'screen', screen: empty })).toBe(
      'Delete “Screen s2”? It has nothing in it.',
    )
    expect(designDeleteSummary({ kind: 'app', app: tree.apps[0]! })).toBe(
      'Delete “Web”? It has nothing in it.',
    )
  })

  it('names an item alone', () => {
    expect(designDeleteSummary({ kind: 'item', item: item({ name: 'v2.png' }) })).toBe(
      'Delete “v2.png”?',
    )
  })
})

describe('designDiscussDraft', () => {
  it('puts a screen reference in an empty draft', () => {
    expect(designDiscussDraft('', { screenId: 's1' })).toBe('&design/s1 ')
  })

  it('puts an item reference after what is already written, apart from it', () => {
    expect(designDiscussDraft('Look at', { screenId: 's1', itemId: 'b2' })).toBe(
      'Look at &design/s1/b2 ',
    )
  })

  it('adds no second space after a draft that already ends in one', () => {
    expect(designDiscussDraft('Look at\n', { screenId: 's1' })).toBe('Look at\n&design/s1 ')
  })
})

describe('designItemFileName', () => {
  it('names an item by the file it was made from', () => {
    expect(designItemFileName(item({}))).toBe('mock.png')
    expect(designItemFileName(html)).toBe('mock.html')
  })

  it('names a link by the item’s own name', () => {
    expect(
      designItemFileName(
        item({ name: 'Figma frame', source: { type: 'link', url: 'https://x.y' } }),
      ),
    ).toBe('Figma frame')
  })
})

describe('designItemAddedByLabel', () => {
  it('says who added an item', () => {
    expect(designItemAddedByLabel(item({ addedBy: { by: 'person' } }))).toBe('Added by you')
    expect(designItemAddedByLabel(item({ addedBy: { by: 'agent' } }))).toBe('Added by an agent')
    expect(designItemAddedByLabel(item({ addedBy: { by: 'run', runId: 'r1' } }))).toBe('From a run')
  })
})

const usage = {
  designBytes: 3 * MB,
  evidenceBytes: 10 * MB,
  uiTestBytes: 0,
  mobileTestBytes: 512 * 1024,
  totalBytes: 13 * MB + 512 * 1024,
}

describe('storageUsageSummary', () => {
  it('reads the project, then every project against the threshold', () => {
    expect(
      storageUsageSummary({
        projectId: 'p1',
        usage,
        standing: { totalBytes: 300 * MB, thresholdBytes: GB, over: false },
      }),
    ).toBe('13.5 MB · all projects 300 MB of 1 GB')
  })
})

describe('storageUsageBreakdown', () => {
  it('lists each store with its size, the ones holding nothing included', () => {
    expect(storageUsageBreakdown(usage)).toEqual([
      { key: 'design', label: 'Design', bytes: 3 * MB, size: '3 MB' },
      { key: 'evidence', label: 'Run proof', bytes: 10 * MB, size: '10 MB' },
      { key: 'ui-test', label: 'UI tests', bytes: 0, size: '0 B' },
      { key: 'mobile-test', label: 'Mobile tests', bytes: 512 * 1024, size: '512 KB' },
    ])
  })
})

describe('storageWarningNotification', () => {
  it('tells the total against the threshold, with the banner’s words', () => {
    expect(
      storageWarningNotification({
        totalBytes: 1.5 * GB,
        thresholdBytes: GB,
        over: true,
        projectId: 'p1',
      }),
    ).toEqual({
      title: 'Project files use 1.5 GB of 1 GB',
      body: STORAGE_WARNING_TEXT.body,
      tag: 'storage:usage-warning',
    })
  })
})
