import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/generated', () => ({
  getProjectDesign: vi.fn(),
  getProjectStorageUsage: vi.fn(),
  createDesignApp: vi.fn(),
  updateDesignApp: vi.fn(),
  deleteDesignApp: vi.fn(),
  createDesignScreen: vi.fn(),
  renameDesignScreen: vi.fn(),
  deleteDesignScreen: vi.fn(),
  createDesignItem: vi.fn(),
  renameDesignItem: vi.fn(),
  approveDesignItem: vi.fn(),
  deleteDesignItem: vi.fn(),
  getDesignItemContent: vi.fn(),
  grantProjectAppViewToken: vi.fn(),
  getStorageUsage: vi.fn(),
}))

import {
  approveDesignItem,
  createDesignApp,
  createDesignItem,
  createDesignScreen,
  deleteDesignApp,
  deleteDesignItem,
  deleteDesignScreen,
  getDesignItemContent,
  getProjectDesign,
  getProjectStorageUsage,
  getStorageUsage,
  grantProjectAppViewToken,
  renameDesignItem,
  renameDesignScreen,
  updateDesignApp,
} from '../api/generated'
import {
  designActionsFor,
  designSnapshot,
  designStateOf,
  designViewTokenFor,
  ensureDesign,
  refreshDesign,
  refreshStorageTotals,
  refreshStorageUsage,
  resetDesignStore,
  storageTotalsSnapshot,
  subscribeDesign,
} from './designStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any
const tree = (name: string) => ({
  apps: [{ id: 'a1', name, kind: 'product', createdAt: 1, updatedAt: 1, screens: [] }],
})

beforeEach(() => {
  vi.resetAllMocks()
  resetDesignStore()
})

describe('designStore', () => {
  it('starts every project empty and unloaded', () => {
    expect(designStateOf(designSnapshot(), 'p1')).toEqual({
      tree: { apps: [] },
      isLoaded: false,
      loadError: null,
      usage: undefined,
    })
  })

  it('loads a project’s design and tells every subscriber', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: tree('Android') })
    const heard = vi.fn()
    const off = subscribeDesign(heard)
    await refreshDesign('p1')
    expect(getProjectDesign).toHaveBeenCalledWith({ path: { projectId: 'p1' }, throwOnError: true })
    expect(designStateOf(designSnapshot(), 'p1')).toMatchObject({
      tree: tree('Android'),
      isLoaded: true,
      loadError: null,
    })
    expect(heard).toHaveBeenCalled()
    off()
  })

  it('keeps what it had and says why when a load fails', async () => {
    asMock(getProjectDesign).mockResolvedValueOnce({ data: tree('Android') })
    await refreshDesign('p1')
    asMock(getProjectDesign).mockRejectedValueOnce(new Error('offline'))
    await refreshDesign('p1')
    const state = designStateOf(designSnapshot(), 'p1')
    expect(state.tree).toEqual(tree('Android'))
    expect(state.loadError?.message).toBe('offline')
  })

  it('drops an answer a later load overtook', async () => {
    let first!: (v: unknown) => void
    asMock(getProjectDesign)
      .mockImplementationOnce(() => new Promise((r) => (first = r)))
      .mockResolvedValueOnce({ data: tree('New') })
    const slow = refreshDesign('p1')
    await refreshDesign('p1')
    first({ data: tree('Old') })
    await slow
    expect(designStateOf(designSnapshot(), 'p1').tree).toEqual(tree('New'))
  })

  it('loads the project’s usage with how the total stands', async () => {
    const report = {
      projectId: 'p1',
      usage: {
        designBytes: 5,
        evidenceBytes: 0,
        uiTestBytes: 0,
        mobileTestBytes: 0,
        totalBytes: 5,
      },
      standing: { totalBytes: 5, thresholdBytes: 10, over: false },
    }
    asMock(getProjectStorageUsage).mockResolvedValue({ data: report })
    await refreshStorageUsage('p1')
    expect(designStateOf(designSnapshot(), 'p1').usage).toEqual(report)
    asMock(getProjectStorageUsage).mockRejectedValue(new Error('404'))
    await refreshStorageUsage('p1')
    expect(designStateOf(designSnapshot(), 'p1').usage).toEqual(report)
  })
})

describe('designActionsFor', () => {
  beforeEach(() => {
    asMock(getProjectDesign).mockResolvedValue({ data: tree('Android') })
    asMock(getProjectStorageUsage).mockResolvedValue({ data: undefined })
  })

  it('calls each route with the project and returns what it made, then reloads the design', async () => {
    const changed = vi.fn()
    const actions = designActionsFor('p1', changed)
    asMock(createDesignApp).mockResolvedValue({ data: { id: 'a1' } })
    asMock(createDesignScreen).mockResolvedValue({ data: { id: 's1' } })
    asMock(createDesignItem).mockResolvedValue({ data: { id: 'i1' } })
    expect(await actions.createApp('Android', 'product')).toEqual({ id: 'a1' })
    expect(createDesignApp).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { name: 'Android', kind: 'product' },
      throwOnError: true,
    })
    expect(await actions.createScreen('a1', 'Login')).toEqual({ id: 's1' })
    expect(createDesignScreen).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { appId: 'a1', name: 'Login' },
      throwOnError: true,
    })
    await actions.uploadDraft('s1', { name: 'a.png', contentBase64: 'AAAA' }, 'Mock')
    expect(createDesignItem).toHaveBeenLastCalledWith({
      path: { projectId: 'p1' },
      body: {
        screenId: 's1',
        name: 'Mock',
        source: { type: 'upload', name: 'a.png', contentBase64: 'AAAA' },
      },
      throwOnError: true,
    })
    await actions.addProjectFileDraft('s1', 'docs/a.html')
    expect(createDesignItem).toHaveBeenLastCalledWith({
      path: { projectId: 'p1' },
      body: { screenId: 's1', source: { type: 'project-file', path: 'docs/a.html' } },
      throwOnError: true,
    })
    await actions.addLinkDraft('s1', 'https://figma.com/x', 'Figma')
    expect(createDesignItem).toHaveBeenLastCalledWith({
      path: { projectId: 'p1' },
      body: { screenId: 's1', name: 'Figma', source: { type: 'link', url: 'https://figma.com/x' } },
      throwOnError: true,
    })
    expect(changed).toHaveBeenCalledTimes(5)
    expect(getProjectDesign).toHaveBeenCalledTimes(5)
    expect(getProjectStorageUsage).toHaveBeenCalledTimes(3)
  })

  it('renames, approves and deletes through their routes', async () => {
    const actions = designActionsFor('p1', () => {})
    for (const fn of [updateDesignApp, renameDesignScreen, renameDesignItem, approveDesignItem]) {
      asMock(fn).mockResolvedValue({ data: { id: 'x' } })
    }
    await actions.updateApp('a1', { name: 'Phone', kind: 'overseer-app' })
    expect(updateDesignApp).toHaveBeenCalledWith({
      path: { projectId: 'p1', appId: 'a1' },
      body: { name: 'Phone', kind: 'overseer-app' },
      throwOnError: true,
    })
    await actions.renameScreen('s1', 'Sign in')
    expect(renameDesignScreen).toHaveBeenCalledWith({
      path: { projectId: 'p1', screenId: 's1' },
      body: { name: 'Sign in' },
      throwOnError: true,
    })
    await actions.renameItem('i1', 'v2')
    expect(renameDesignItem).toHaveBeenCalledWith({
      path: { projectId: 'p1', itemId: 'i1' },
      body: { name: 'v2' },
      throwOnError: true,
    })
    await actions.approveItem('i1', true)
    expect(approveDesignItem).toHaveBeenCalledWith({
      path: { projectId: 'p1', itemId: 'i1' },
      body: { approved: true },
      throwOnError: true,
    })
    await actions.deleteItem('i1')
    await actions.deleteScreen('s1')
    await actions.deleteApp('a1')
    expect(deleteDesignItem).toHaveBeenCalledWith({
      path: { projectId: 'p1', itemId: 'i1' },
      throwOnError: true,
    })
    expect(deleteDesignScreen).toHaveBeenCalledWith({
      path: { projectId: 'p1', screenId: 's1' },
      throwOnError: true,
    })
    expect(deleteDesignApp).toHaveBeenCalledWith({
      path: { projectId: 'p1', appId: 'a1' },
      throwOnError: true,
    })
  })

  it('fetches an item’s bytes or text with the bearer, and a view token for an <img> or <iframe>', async () => {
    const actions = designActionsFor('p1', () => {})
    asMock(getDesignItemContent).mockResolvedValue({ data: 'bytes' })
    expect(await actions.fetchContent('i1', 'arraybuffer')).toBe('bytes')
    expect(getDesignItemContent).toHaveBeenCalledWith({
      path: { projectId: 'p1', itemId: 'i1' },
      responseType: 'arraybuffer',
      throwOnError: true,
    })
    asMock(grantProjectAppViewToken).mockResolvedValue({ data: { token: 't', expiresAt: 'e' } })
    expect(await actions.mintViewToken()).toEqual({ token: 't', expiresAt: 'e' })
  })
})

describe('ensureDesign', () => {
  it('loads a project once for every surface asking at the same time', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: tree('Android') })
    await Promise.all([ensureDesign('p1'), ensureDesign('p1'), ensureDesign('p1')])
    expect(getProjectDesign).toHaveBeenCalledTimes(1)
    expect(designStateOf(designSnapshot(), 'p1').tree).toEqual(tree('Android'))
  })

  it('does not load a project it already has, unless told it changed', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: tree('Android') })
    await ensureDesign('p1')
    await ensureDesign('p1')
    expect(getProjectDesign).toHaveBeenCalledTimes(1)
    asMock(getProjectDesign).mockResolvedValue({ data: tree('iOS') })
    await ensureDesign('p1', { changed: true })
    expect(getProjectDesign).toHaveBeenCalledTimes(2)
    expect(designStateOf(designSnapshot(), 'p1').tree).toEqual(tree('iOS'))
  })

  it('loads each project on its own', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: tree('Android') })
    await Promise.all([ensureDesign('p1'), ensureDesign('p2')])
    expect(getProjectDesign).toHaveBeenCalledTimes(2)
  })
})

describe('designViewTokenFor', () => {
  const NOW = Date.parse('2026-10-09T12:00:00Z')
  const inMinutes = (m: number) => new Date(NOW + m * 60_000).toISOString()

  it('mints one token for every surface of a project and keeps it while it is fresh', async () => {
    asMock(grantProjectAppViewToken).mockResolvedValue({
      data: { token: 't1', expiresAt: inMinutes(15) },
    })
    const [a, b] = await Promise.all([designViewTokenFor('p1', NOW), designViewTokenFor('p1', NOW)])
    expect(a).toEqual({ token: 't1', expiresAt: inMinutes(15) })
    expect(b).toEqual(a)
    expect(await designViewTokenFor('p1', NOW + 10 * 60_000)).toEqual(a)
    expect(grantProjectAppViewToken).toHaveBeenCalledTimes(1)
    expect(grantProjectAppViewToken).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      throwOnError: true,
    })
  })

  it('mints again within a minute of the token running out', async () => {
    asMock(grantProjectAppViewToken)
      .mockResolvedValueOnce({ data: { token: 't1', expiresAt: inMinutes(15) } })
      .mockResolvedValueOnce({ data: { token: 't2', expiresAt: inMinutes(30) } })
    await designViewTokenFor('p1', NOW)
    expect((await designViewTokenFor('p1', NOW + 14.5 * 60_000)).token).toBe('t2')
  })

  it('mints for each project, and tries again after a refusal', async () => {
    asMock(grantProjectAppViewToken)
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValue({ data: { token: 't', expiresAt: inMinutes(15) } })
    await expect(designViewTokenFor('p1', NOW)).rejects.toThrow('nope')
    expect((await designViewTokenFor('p1', NOW)).token).toBe('t')
    await designViewTokenFor('p2', NOW)
    expect(grantProjectAppViewToken).toHaveBeenCalledTimes(3)
  })
})

describe('refreshStorageTotals', () => {
  const totals = {
    totalBytes: 10,
    thresholdBytes: 100,
    over: false,
    projects: [
      {
        projectId: 'p1',
        usage: {
          designBytes: 10,
          evidenceBytes: 0,
          uiTestBytes: 0,
          mobileTestBytes: 0,
          totalBytes: 10,
        },
      },
    ],
  }

  it('starts unread, then holds every project’s usage and tells subscribers', async () => {
    expect(storageTotalsSnapshot()).toEqual({ totals: undefined, error: null })
    asMock(getStorageUsage).mockResolvedValue({ data: totals })
    const heard = vi.fn()
    const off = subscribeDesign(heard)
    await refreshStorageTotals()
    expect(getStorageUsage).toHaveBeenCalledWith({ throwOnError: true })
    expect(storageTotalsSnapshot()).toEqual({ totals, error: null })
    expect(heard).toHaveBeenCalled()
    off()
  })

  it('keeps what it had and says why when a read fails', async () => {
    asMock(getStorageUsage).mockResolvedValue({ data: totals })
    await refreshStorageTotals()
    asMock(getStorageUsage).mockRejectedValue(new Error('down'))
    await refreshStorageTotals()
    expect(storageTotalsSnapshot().totals).toEqual(totals)
    expect(storageTotalsSnapshot().error?.message).toBe('down')
  })
})
