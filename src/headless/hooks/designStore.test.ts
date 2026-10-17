import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/generated', () => ({
  getProjectDesign: vi.fn(),
  getProjectStorageUsage: vi.fn(),
  createDesignApp: vi.fn(),
  updateDesignApp: vi.fn(),
  deleteDesignApp: vi.fn(),
  createDesignScreen: vi.fn(),
  updateDesignScreen: vi.fn(),
  deleteDesignScreen: vi.fn(),
  createDesignState: vi.fn(),
  updateDesignState: vi.fn(),
  deleteDesignState: vi.fn(),
  proposeDesign: vi.fn(),
  proposeDesignDraft: vi.fn(),
  fileDesignProposalEntry: vi.fn(),
  acceptDesignProposal: vi.fn(),
  keepDesignProposalAsAlternative: vi.fn(),
  sendBackDesignProposal: vi.fn(),
  renameDesignProposal: vi.fn(),
  deleteDesignProposal: vi.fn(),
  restoreDesignVersions: vi.fn(),
  decideDesignTidyMove: vi.fn(),
  previewDesignTidyPlan: vi.fn(),
  applyDesignTidyPlan: vi.fn(),
  chooseDesignProposal: vi.fn(),
  captureDesignPlayground: vi.fn(),
  dismissDesignTidyPlan: vi.fn(),
  getDesignVersionContent: vi.fn(),
  getDesignProposalEntryContent: vi.fn(),
  grantProjectAppViewToken: vi.fn(),
  getStorageUsage: vi.fn(),
}))

import {
  acceptDesignProposal,
  applyDesignTidyPlan,
  captureDesignPlayground,
  chooseDesignProposal,
  createDesignApp,
  createDesignScreen,
  createDesignState,
  decideDesignTidyMove,
  deleteDesignApp,
  deleteDesignProposal,
  deleteDesignScreen,
  deleteDesignState,
  dismissDesignTidyPlan,
  fileDesignProposalEntry,
  getDesignProposalEntryContent,
  getDesignVersionContent,
  getProjectDesign,
  getProjectStorageUsage,
  getStorageUsage,
  grantProjectAppViewToken,
  keepDesignProposalAsAlternative,
  previewDesignTidyPlan,
  proposeDesign,
  proposeDesignDraft,
  renameDesignProposal,
  restoreDesignVersions,
  sendBackDesignProposal,
  updateDesignApp,
  updateDesignScreen,
  updateDesignState,
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
const index = (name: string) => ({
  version: 2,
  apps: [{ id: 'a1', name, kind: 'product', aliases: [], createdAt: 1, updatedAt: 1 }],
  screens: [],
  states: [],
  versions: [],
  proposals: [],
  tidyPlans: [],
})
const EMPTY_INDEX = {
  version: 2,
  apps: [],
  screens: [],
  states: [],
  versions: [],
  proposals: [],
  tidyPlans: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  resetDesignStore()
})

describe('designStore', () => {
  it('starts every project empty and unloaded', () => {
    expect(designStateOf(designSnapshot(), 'p1')).toEqual({
      index: EMPTY_INDEX,
      isLoaded: false,
      loadError: null,
      usage: undefined,
    })
  })

  it('loads a project’s design and tells every subscriber', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: index('Android') })
    const heard = vi.fn()
    const off = subscribeDesign(heard)
    await refreshDesign('p1')
    expect(getProjectDesign).toHaveBeenCalledWith({ path: { projectId: 'p1' }, throwOnError: true })
    expect(designStateOf(designSnapshot(), 'p1')).toMatchObject({
      index: index('Android'),
      isLoaded: true,
      loadError: null,
    })
    expect(heard).toHaveBeenCalled()
    off()
  })

  it('keeps what it had and says why when a load fails', async () => {
    asMock(getProjectDesign).mockResolvedValueOnce({ data: index('Android') })
    await refreshDesign('p1')
    asMock(getProjectDesign).mockRejectedValueOnce(new Error('offline'))
    await refreshDesign('p1')
    const state = designStateOf(designSnapshot(), 'p1')
    expect(state.index).toEqual(index('Android'))
    expect(state.loadError?.message).toBe('offline')
  })

  it('drops an answer a later load overtook', async () => {
    let first!: (v: unknown) => void
    asMock(getProjectDesign)
      .mockImplementationOnce(() => new Promise((r) => (first = r)))
      .mockResolvedValueOnce({ data: index('New') })
    const slow = refreshDesign('p1')
    await refreshDesign('p1')
    first({ data: index('Old') })
    await slow
    expect(designStateOf(designSnapshot(), 'p1').index).toEqual(index('New'))
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
    asMock(getProjectDesign).mockResolvedValue({ data: index('Android') })
    asMock(getProjectStorageUsage).mockResolvedValue({ data: undefined })
  })

  it('calls each route with the project and returns what it made, then reloads the design and tells the cache', async () => {
    const changed = vi.fn()
    const actions = designActionsFor('p1', changed)
    const made = { id: 'x' }
    const cases: Array<[unknown, () => Promise<unknown>, unknown]> = [
      [
        createDesignApp,
        () => actions.createApp('Web', 'product'),
        { path: { projectId: 'p1' }, body: { name: 'Web', kind: 'product' }, throwOnError: true },
      ],
      [
        updateDesignApp,
        () => actions.updateApp('a1', { name: 'W' }),
        { path: { projectId: 'p1', appId: 'a1' }, body: { name: 'W' }, throwOnError: true },
      ],
      [
        createDesignScreen,
        () =>
          actions.createScreen({ appId: 'a1', name: 'Chip', kind: 'component', group: 'Chips' }),
        {
          path: { projectId: 'p1' },
          body: { appId: 'a1', name: 'Chip', kind: 'component', group: 'Chips' },
          throwOnError: true,
        },
      ],
      [
        updateDesignScreen,
        () => actions.updateScreen('s1', { uses: ['c1'] }),
        { path: { projectId: 'p1', screenId: 's1' }, body: { uses: ['c1'] }, throwOnError: true },
      ],
      [
        createDesignState,
        () => actions.createState({ screenId: 's1', name: 'Filled' }),
        { path: { projectId: 'p1' }, body: { screenId: 's1', name: 'Filled' }, throwOnError: true },
      ],
      [
        updateDesignState,
        () => actions.updateState('st1', { name: 'Typed' }),
        { path: { projectId: 'p1', stateId: 'st1' }, body: { name: 'Typed' }, throwOnError: true },
      ],
      [
        proposeDesign,
        () =>
          actions.propose({
            appId: 'a1',
            title: 'T',
            entries: [{ source: { type: 'link', url: 'https://x' } }],
          }),
        {
          path: { projectId: 'p1' },
          body: {
            appId: 'a1',
            title: 'T',
            entries: [{ source: { type: 'link', url: 'https://x' } }],
          },
          throwOnError: true,
        },
      ],
      [
        proposeDesignDraft,
        () =>
          actions.proposeDraft({ appId: 'a1', source: { type: 'project-file', path: 'd.html' } }),
        {
          path: { projectId: 'p1' },
          body: { appId: 'a1', source: { type: 'project-file', path: 'd.html' } },
          throwOnError: true,
        },
      ],
      [
        fileDesignProposalEntry,
        () => actions.fileEntry('pr1', 'e1', { screenId: 's1' }),
        {
          path: { projectId: 'p1', proposalId: 'pr1', entryId: 'e1' },
          body: { target: { screenId: 's1' } },
          throwOnError: true,
        },
      ],
      [
        acceptDesignProposal,
        () => actions.acceptProposal('pr1'),
        { path: { projectId: 'p1', proposalId: 'pr1' }, body: {}, throwOnError: true },
      ],
      [
        acceptDesignProposal,
        () => actions.acceptProposal('pr1', ['e1']),
        {
          path: { projectId: 'p1', proposalId: 'pr1' },
          body: { entryIds: ['e1'] },
          throwOnError: true,
        },
      ],
      [
        keepDesignProposalAsAlternative,
        () => actions.keepProposal('pr1'),
        { path: { projectId: 'p1', proposalId: 'pr1' }, throwOnError: true },
      ],
      [
        chooseDesignProposal,
        () => actions.chooseProposal('pr1'),
        { path: { projectId: 'p1', proposalId: 'pr1' }, throwOnError: true },
      ],
      [
        sendBackDesignProposal,
        () => actions.sendBackProposal('pr1', 'Bigger'),
        {
          path: { projectId: 'p1', proposalId: 'pr1' },
          body: { note: 'Bigger' },
          throwOnError: true,
        },
      ],
      [
        renameDesignProposal,
        () => actions.renameProposal('pr1', 'New'),
        {
          path: { projectId: 'p1', proposalId: 'pr1' },
          body: { title: 'New' },
          throwOnError: true,
        },
      ],
      [
        restoreDesignVersions,
        () => actions.restoreVersions(['v1']),
        { path: { projectId: 'p1' }, body: { versionIds: ['v1'] }, throwOnError: true },
      ],
      [
        captureDesignPlayground,
        () =>
          actions.savePlaygroundState({
            appId: 'a1',
            target: { screenName: 'Run header', screenKind: 'component', stateName: 'Running' },
            address: 'scene=run-header',
          }),
        {
          path: { projectId: 'p1' },
          body: {
            appId: 'a1',
            target: { screenName: 'Run header', screenKind: 'component', stateName: 'Running' },
            address: 'scene=run-header',
          },
          throwOnError: true,
        },
      ],
      [
        decideDesignTidyMove,
        () => actions.decideTidyMove('t1', 'm1', 'accept'),
        {
          path: { projectId: 'p1', planId: 't1', moveId: 'm1' },
          body: { decision: 'accept' },
          throwOnError: true,
        },
      ],
      [
        applyDesignTidyPlan,
        () => actions.applyTidy('t1'),
        { path: { projectId: 'p1', planId: 't1' }, throwOnError: true },
      ],
      [
        dismissDesignTidyPlan,
        () => actions.dismissTidy('t1'),
        { path: { projectId: 'p1', planId: 't1' }, throwOnError: true },
      ],
    ]
    for (const [route, call, args] of cases) {
      asMock(route).mockResolvedValue({ data: made })
      asMock(getProjectDesign).mockClear()
      expect(await call()).toBe(made)
      expect(route).toHaveBeenLastCalledWith(args)
      expect(getProjectDesign).toHaveBeenCalledTimes(1)
    }
    expect(changed).toHaveBeenCalledTimes(cases.length)
  })

  it('previews a tidy-up plan without reloading anything', async () => {
    const actions = designActionsFor('p1', () => {})
    asMock(previewDesignTidyPlan).mockResolvedValue({ data: { appsBefore: 2 } })
    expect(await actions.previewTidy('t1')).toEqual({ appsBefore: 2 })
    expect(getProjectDesign).not.toHaveBeenCalled()
  })

  it('deletes through its route, then reloads the design and the usage', async () => {
    const actions = designActionsFor('p1', () => {})
    const cases: Array<[unknown, () => Promise<void>, unknown]> = [
      [deleteDesignApp, () => actions.deleteApp('a1'), { projectId: 'p1', appId: 'a1' }],
      [deleteDesignScreen, () => actions.deleteScreen('s1'), { projectId: 'p1', screenId: 's1' }],
      [deleteDesignState, () => actions.deleteState('st1'), { projectId: 'p1', stateId: 'st1' }],
      [
        deleteDesignProposal,
        () => actions.deleteProposal('pr1'),
        { projectId: 'p1', proposalId: 'pr1' },
      ],
    ]
    for (const [route, call, path] of cases) {
      asMock(route).mockResolvedValue({})
      asMock(getProjectStorageUsage).mockClear()
      await call()
      expect(route).toHaveBeenLastCalledWith({ path, throwOnError: true })
      expect(getProjectStorageUsage).toHaveBeenCalledTimes(1)
    }
  })

  it('reloads the usage after a proposal, which keeps new files', async () => {
    const actions = designActionsFor('p1', () => {})
    asMock(proposeDesign).mockResolvedValue({ data: { id: 'pr' } })
    await actions.propose({ appId: 'a1', title: 'T', entries: [] })
    expect(getProjectStorageUsage).toHaveBeenCalledTimes(1)
  })

  it('fetches a version’s or an entry’s bytes or text with the bearer, and a view token for an <img> or <iframe>', async () => {
    const actions = designActionsFor('p1', () => {})
    asMock(getDesignVersionContent).mockResolvedValue({ data: 'bytes' })
    expect(await actions.fetchContent({ versionId: 'v1' }, 'arraybuffer')).toBe('bytes')
    expect(getDesignVersionContent).toHaveBeenCalledWith({
      path: { projectId: 'p1', versionId: 'v1' },
      responseType: 'arraybuffer',
      throwOnError: true,
    })
    asMock(getDesignProposalEntryContent).mockResolvedValue({ data: '<p>' })
    expect(await actions.fetchContent({ proposalId: 'pr', entryId: 'e' }, 'text')).toBe('<p>')
    expect(getDesignProposalEntryContent).toHaveBeenCalledWith({
      path: { projectId: 'p1', proposalId: 'pr', entryId: 'e' },
      responseType: 'text',
      throwOnError: true,
    })
    asMock(grantProjectAppViewToken).mockResolvedValue({ data: { token: 't', expiresAt: 'e' } })
    expect(await actions.mintViewToken()).toEqual({ token: 't', expiresAt: 'e' })
  })
})

describe('ensureDesign', () => {
  it('loads a project once for every surface asking at the same time', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: index('Android') })
    await Promise.all([ensureDesign('p1'), ensureDesign('p1'), ensureDesign('p1')])
    expect(getProjectDesign).toHaveBeenCalledTimes(1)
    expect(designStateOf(designSnapshot(), 'p1').index).toEqual(index('Android'))
  })

  it('does not load a project it already has, unless told it changed', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: index('Android') })
    await ensureDesign('p1')
    await ensureDesign('p1')
    expect(getProjectDesign).toHaveBeenCalledTimes(1)
    asMock(getProjectDesign).mockResolvedValue({ data: index('iOS') })
    await ensureDesign('p1', { changed: true })
    expect(getProjectDesign).toHaveBeenCalledTimes(2)
    expect(designStateOf(designSnapshot(), 'p1').index).toEqual(index('iOS'))
  })

  it('loads each project on its own', async () => {
    asMock(getProjectDesign).mockResolvedValue({ data: index('Android') })
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
