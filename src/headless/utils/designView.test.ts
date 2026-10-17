import { describe, expect, it } from 'vitest'
import type { DesignIndex, DesignProposal, DesignSource, DesignVersion } from '../api'
import {
  designAppNav,
  designAskSummary,
  designCaseMatrix,
  designComponentUsers,
  designDeleteSummary,
  designDiscussDraft,
  designFileTargets,
  designFirstProposal,
  designHistory,
  designOriginText,
  designPreviewShown,
  designProposalGroups,
  designProposalSummary,
  designReferencePreview,
  designSelection,
  designTidyMoveView,
  storageUsageBreakdown,
  storageUsageSummary,
  storageWarningNotification,
} from './designView'

const at = { createdAt: 1, updatedAt: 1 }
const blob = (ch: string): DesignSource => ({
  type: 'blob',
  sha256: ch.repeat(64),
  mediaType: 'image/png',
  bytes: 3,
  originalName: `${ch}.png`,
})
const version = (
  id: string,
  stateId: string,
  variant: string,
  number: number,
  ch: string,
  createdAt = number,
): DesignVersion => ({
  id,
  stateId,
  variant,
  number,
  source: blob(ch),
  origin: { by: 'person' },
  createdAt,
})
const proposal = (over: Partial<DesignProposal> & Pick<DesignProposal, 'id'>): DesignProposal => ({
  appId: 'a1',
  title: over.id,
  status: 'open',
  origin: { by: 'agent' },
  entries: [],
  pieces: [],
  ...at,
  ...over,
})
const entry = (id: string, target: object, variant: string, ch: string) => ({
  id,
  target,
  variant,
  source: blob(ch),
  links: [],
  pieces: [],
})

function design(): DesignIndex {
  return {
    version: 2,
    apps: [
      { id: 'a1', name: 'Game', kind: 'product', aliases: [], ...at },
      { id: 'a2', name: 'Site', kind: 'product', aliases: [], ...at },
    ],
    screens: [
      {
        id: 's1',
        appId: 'a1',
        name: 'Army setup',
        kind: 'screen',
        aliases: [],
        uses: ['c1'],
        variants: ['Light', 'Dark'],
        ...at,
      },
      {
        id: 'c1',
        appId: 'a1',
        name: 'Faction chip',
        kind: 'component',
        group: 'Chips',
        aliases: [],
        uses: [],
        variants: [],
        ...at,
      },
      {
        id: 'c2',
        appId: 'a1',
        name: 'Loose',
        kind: 'component',
        aliases: [],
        uses: [],
        variants: [],
        ...at,
      },
      {
        id: 's2',
        appId: 'a2',
        name: 'Home',
        kind: 'screen',
        aliases: [],
        uses: [],
        variants: [],
        ...at,
      },
    ],
    states: [
      { id: 'st1', screenId: 's1', name: 'Empty army', ...at },
      { id: 'st2', screenId: 's1', name: 'Full army', ...at },
    ],
    versions: [
      version('v1', 'st1', 'Light', 1, 'a', 1),
      version('v2', 'st1', 'Light', 2, 'b', 5),
      { ...version('v3', 'st1', 'Dark', 1, 'c', 3), proposalId: 'old' },
    ],
    proposals: [
      proposal({
        id: 'faction',
        title: 'Faction cards',
        createdAt: 30,
        entries: [
          entry('e1', { screenId: 's1', stateId: 'st1' }, 'Light', 'd'),
          entry('e2', { screenName: 'Picker' }, 'Light', 'e'),
        ],
      }),
      proposal({
        id: 'compact',
        title: 'Compact',
        question: 'How should it look?',
        status: 'accepted',
        createdAt: 10,
        entries: [entry('f1', {}, 'Visual', 'f')],
      }),
      proposal({
        id: 'grid',
        title: 'Grid',
        question: 'How should it look?',
        status: 'alternative',
        createdAt: 11,
        entries: [entry('g1', {}, 'Visual', 'g'), entry('g2', {}, 'Readable', 'h')],
      }),
      proposal({ id: 'old', title: 'Old look', status: 'accepted', createdAt: 2 }),
      proposal({ id: 'site', appId: 'a2', createdAt: 40 }),
    ],
    tidyPlans: [],
  }
}

describe('designSelection', () => {
  it('opens a proposal in its app’s proposals', () => {
    expect(designSelection(design(), { proposal: 'site', tab: 'history' })).toEqual({
      appId: 'a2',
      tab: 'proposals',
      proposalId: 'site',
    })
  })

  it('opens a state, with its variant, in its app’s current design', () => {
    expect(designSelection(design(), { state: 'st2', variant: 'Dark' })).toEqual({
      appId: 'a1',
      tab: 'current',
      screenId: 's1',
      stateId: 'st2',
      variant: 'Dark',
    })
    expect(designSelection(design(), { state: 'st2' })).not.toHaveProperty('variant')
  })

  it('opens a screen on the tab asked for, else an app, else the first app', () => {
    expect(designSelection(design(), { screen: 's1', tab: 'history' })).toEqual({
      appId: 'a1',
      tab: 'history',
      screenId: 's1',
    })
    expect(designSelection(design(), { app: 'a2', tab: 'tidy' })).toEqual({
      appId: 'a2',
      tab: 'tidy',
    })
    expect(designSelection(design(), { app: 'nope', tab: 'weird' })).toEqual({
      appId: 'a1',
      tab: 'current',
    })
    expect(designSelection(design(), { proposal: 'nope', state: 'nope', screen: 'nope' })).toEqual({
      appId: 'a1',
      tab: 'current',
    })
    expect(designSelection({ ...design(), apps: [] }, {})).toEqual({ tab: 'current' })
  })
})

describe('designAppNav', () => {
  it('lists screens with what waits on them, components by group, and the app’s counts', () => {
    const nav = designAppNav(design(), 'a1')!
    expect(nav.screens).toEqual([{ id: 's1', name: 'Army setup', states: 2, waiting: 1 }])
    expect(nav.componentGroups).toEqual([
      { group: 'Chips', components: [{ id: 'c1', name: 'Faction chip', states: 0, waiting: 0 }] },
      { group: 'Components', components: [{ id: 'c2', name: 'Loose', states: 0, waiting: 0 }] },
    ])
    expect(nav.openProposals).toBe(1)
    expect(nav.versions).toBe(3)
    expect(designAppNav(design(), 'nope')).toBeUndefined()
  })
})

describe('proposals', () => {
  it('sums up what a proposal changes', () => {
    expect(designProposalSummary([])).toBe('0 images')
    expect(
      designProposalSummary([
        { entryId: 'a', variant: 'L', mark: 'changed' },
        { entryId: 'b', variant: 'L', mark: 'new-screen' },
        { entryId: 'c', variant: 'L', mark: 'new' },
        { entryId: 'd', variant: 'L', mark: 'unchanged' },
        { entryId: 'e', variant: 'L', mark: 'unfiled' },
      ]),
    ).toBe('1 changed · 2 new · 1 unchanged · 1 not filed')
  })

  it('groups an app’s proposals: waiting, the answers to each question, then the decided, newest first', () => {
    const groups = designProposalGroups(design(), 'a1')
    expect(groups.map((g) => [g.key, g.title, g.items.map((i) => i.proposal.id)])).toEqual([
      ['waiting', 'Waiting for you', ['faction']],
      ['q:How should it look?', 'Answers to “How should it look?”', ['grid', 'compact']],
      ['decided', 'Decided', ['old']],
    ])
    expect(groups[0]!.items[0]!.summary).toBe('1 changed · 1 new')
    expect(groups[1]!.question).toBe('How should it look?')
    expect(designProposalGroups(design(), 'a2').map((g) => g.key)).toEqual(['waiting'])
    expect(designProposalGroups({ ...design(), proposals: [] }, 'a1')).toEqual([])
  })

  it('picks the proposal asked for, else the newest open one, else the newest', () => {
    expect(designFirstProposal(design(), 'a1', 'grid')?.id).toBe('grid')
    expect(designFirstProposal(design(), 'a1')?.id).toBe('faction')
    const decided = {
      ...design(),
      proposals: design().proposals.map((p) => ({ ...p, status: 'accepted' as const })),
    }
    expect(designFirstProposal(decided, 'a1')?.id).toBe('faction')
    expect(designFirstProposal(design(), 'nope')).toBeUndefined()
  })

  it('lays the answers to a question out as cases: a row per choice, a column per variant', () => {
    const matrix = designCaseMatrix(design(), 'a1', 'How should it look?')!
    expect(matrix.variants).toEqual(['Visual', 'Readable'])
    expect(matrix.rows.map((r) => [r.proposal.id, r.cells.map((c) => c?.id ?? null)])).toEqual([
      ['compact', ['f1', null]],
      ['grid', ['g1', 'g2']],
    ])
    expect(designCaseMatrix(design(), 'a1', 'Nobody asked')).toBeUndefined()
  })
})

describe('designHistory', () => {
  it('lists each screen’s states with their versions newest first, the current marked, and where each came from', () => {
    const history = designHistory(design(), 'a1')
    expect(history).toHaveLength(1)
    expect(history[0]!.screen.id).toBe('s1')
    expect(history[0]!.states.map((s) => s.state.id)).toEqual(['st1'])
    expect(history[0]!.states[0]!.versions.map((v) => [v.version.id, v.current, v.from])).toEqual([
      ['v2', true, 'From you'],
      ['v3', true, 'Old look'],
      ['v1', false, 'From you'],
    ])
    expect(designHistory(design(), 'a2')).toEqual([])
  })

  it('says where a version or proposal came from', () => {
    expect(designOriginText({ by: 'run' })).toBe('From a run')
    expect(designOriginText({ by: 'agent' })).toBe('From an agent')
    expect(designOriginText({ by: 'person' })).toBe('From you')
  })
})

describe('designTidyMoveView', () => {
  it('names what each kind of move takes and where it goes', () => {
    const index = design()
    const view = (move: Parameters<typeof designTidyMoveView>[1]) => designTidyMoveView(index, move)
    const base = { id: 'm', title: 't', why: 'w' }
    expect(
      view({ ...base, kind: 'merge-apps', from: ['a2', 'gone'], to: { id: 'a1' } }),
    ).toMatchObject({
      kindLabel: 'Merge apps',
      from: ['Site', 'gone'],
      to: 'Game',
    })
    expect(
      view({ ...base, kind: 'merge-screens', from: ['s2'], to: { name: 'Standings' } }),
    ).toMatchObject({
      from: ['Site › Home'],
      to: 'Standings',
    })
    expect(
      view({
        ...base,
        kind: 'fold-history',
        from: ['st2'],
        to: { screenId: 's1', name: 'Current' },
      }),
    ).toMatchObject({
      from: ['Army setup › Full army'],
      to: 'Army setup › Current',
    })
    expect(view({ ...base, kind: 'fold-history', from: ['st2'], to: { id: 'st1' } }).to).toBe(
      'Army setup › Empty army',
    )
    expect(
      view({ ...base, kind: 'remove-duplicate', from: ['v1'], to: { id: 'v2' } }),
    ).toMatchObject({
      from: ['Army setup › Empty army · Light · v1'],
      to: 'Army setup › Empty army · Light · v2',
    })
    expect(view({ ...base, kind: 'merge-screens', from: [], to: {} }).to).toBe('')
  })
})

describe('filing, components and previews', () => {
  it('offers the app’s screens and components, each with its states', () => {
    expect(designFileTargets(design(), 'a1')).toEqual([
      {
        screenId: 's1',
        screenName: 'Army setup',
        kind: 'screen',
        states: [
          { id: 'st1', name: 'Empty army' },
          { id: 'st2', name: 'Full army' },
        ],
      },
      { screenId: 'c1', screenName: 'Faction chip', kind: 'component', states: [] },
      { screenId: 'c2', screenName: 'Loose', kind: 'component', states: [] },
    ])
  })

  it('names the screens that use a component', () => {
    expect(designComponentUsers(design(), 'c1')).toEqual(['Army setup'])
    expect(designComponentUsers(design(), 'c2')).toEqual([])
  })

  it('previews a screen by its first current look, and a state by its own', () => {
    expect(designPreviewShown(design(), 's1')?.ref).toEqual({ versionId: 'v2' })
    expect(designPreviewShown(design(), 'c1')).toBeUndefined()
    expect(designReferencePreview(design(), { stateId: 'st1' })?.ref).toEqual({ versionId: 'v2' })
    expect(designReferencePreview(design(), { stateId: 'st2' })).toBeUndefined()
    expect(designReferencePreview(design(), { stateId: 'nope' })).toBeUndefined()
    expect(designReferencePreview(design(), { screenId: 's1' })?.ref).toEqual({ versionId: 'v2' })
    expect(designReferencePreview(design(), {})).toBeUndefined()
  })
})

describe('designDeleteSummary', () => {
  it('says what goes with what is deleted', () => {
    const index = design()
    expect(designDeleteSummary(index, { kind: 'proposal', proposal: index.proposals[0]! })).toBe(
      'Delete the proposal “Faction cards”?',
    )
    expect(designDeleteSummary(index, { kind: 'state', state: index.states[0]! })).toBe(
      'Delete “Empty army”? Its 3 versions go with it.',
    )
    expect(designDeleteSummary(index, { kind: 'state', state: index.states[1]! })).toBe(
      'Delete “Full army”? It has no versions.',
    )
    expect(designDeleteSummary(index, { kind: 'screen', screen: index.screens[0]! })).toBe(
      'Delete “Army setup”? Its 2 states and 3 versions go with it.',
    )
    expect(designDeleteSummary(index, { kind: 'screen', screen: index.screens[1]! })).toBe(
      'Delete “Faction chip”? It has nothing in it.',
    )
    expect(designDeleteSummary(index, { kind: 'app', app: index.apps[0]! })).toBe(
      'Delete “Game”? Its 3 screens, 3 versions and 4 proposals go with it.',
    )
    const bare = { ...index, screens: [], proposals: [] }
    expect(designDeleteSummary(bare, { kind: 'app', app: index.apps[1]! })).toBe(
      'Delete “Site”? It has nothing in it.',
    )
  })
})

describe('designDiscussDraft', () => {
  it('adds a screen or state token to the draft, spaced', () => {
    expect(designDiscussDraft('', { screenId: 's1' })).toBe('&design/s1 ')
    expect(designDiscussDraft('Look at', { screenId: 's1', stateId: 'st1' })).toBe(
      'Look at &design/s1/st1 ',
    )
    expect(designDiscussDraft('Look at ', { screenId: 's1' })).toBe('Look at &design/s1 ')
  })
})

describe('storage usage', () => {
  const usage = {
    designBytes: 2048,
    evidenceBytes: 1024,
    uiTestBytes: 0,
    mobileTestBytes: 0,
    totalBytes: 3072,
  }

  it('sums up and breaks down a project’s usage', () => {
    expect(
      storageUsageSummary({
        projectId: 'p',
        usage,
        standing: { totalBytes: 3072, thresholdBytes: 1_048_576, over: false },
      }),
    ).toBe('3 KB · all projects 3 KB of 1 MB')
    expect(storageUsageBreakdown(usage).map((r) => [r.key, r.size])).toEqual([
      ['design', '2 KB'],
      ['evidence', '1 KB'],
      ['ui-test', '0 B'],
      ['mobile-test', '0 B'],
    ])
  })

  it('words the warning notification', () => {
    expect(
      storageWarningNotification({ totalBytes: 2048, thresholdBytes: 1024, over: true }),
    ).toMatchObject({
      title: 'Project files use 2 KB of 1 KB',
      tag: 'storage:usage-warning',
    })
  })
})

describe('designAskSummary', () => {
  it('reads each screen an ask names as found or new, with the states it replaces or adds, and the variants once', () => {
    const index = {
      ...design(),
      screens: design().screens.map((s) => (s.id === 's1' ? { ...s, aliases: ['Setup'] } : s)),
    }
    expect(
      designAskSummary(index, [
        { screenId: 's1', stateId: 'st1', variant: 'Light' },
        { screenName: 'setup', stateName: 'Full army', variant: 'Dark' },
        { screenName: 'Army setup', stateName: 'Brand new', variant: 'Light' },
        { screenName: 'Picker', stateName: 'Open' },
        { screenName: 'Picker' },
        {},
        { variant: 'Phone' },
      ]),
    ).toEqual({
      screens: [
        {
          name: 'Army setup',
          found: { app: 'Game', versions: 3 },
          states: [
            { name: 'Empty army', tag: 'replaces' },
            { name: 'Full army', tag: 'new' },
            { name: 'Brand new', tag: 'new' },
          ],
        },
        {
          name: 'Picker',
          states: [
            { name: 'Open', tag: 'new' },
            { name: 'Default', tag: 'new' },
          ],
        },
      ],
      unfiled: 2,
      variants: ['Light', 'Dark', 'Phone'],
    })
  })
})
