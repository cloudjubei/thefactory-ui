import { describe, expect, it } from 'vitest'
import { knowledgeTextParts, knowledgeView } from './knowledgeOverviewView'
import type {
  KnowledgeMapStatus,
  KnowledgeSectionView,
  KnowledgeViewFormat,
  ProjectKnowledgeOverview,
  ProjectOverviewData,
} from './knowledgeOverviewTypes'

const FORMAT: KnowledgeViewFormat = {
  when: (iso) => `<${iso.slice(0, 16)}>`,
  duration: (ms) => `${Math.round(ms / 1000)}s`,
}

type Claim = ProjectOverviewData['purpose']

const claim = (text: string, citations: string[] = [], label: Claim['label'] = 'observed') => ({
  text,
  label,
  citations,
})

const fresh = (refreshedAt: string, stale = false) => ({
  refreshedAt,
  contentKey: 'a',
  currentContentKey: stale ? 'b' : 'a',
  stale,
})

const file = (itemId: string, name: string, path: string, line?: number) => ({
  itemId,
  name,
  level: 1,
  path,
  ...(line !== undefined ? { line } : {}),
  hierarchyPath: [],
  files: [path],
})

const area = (itemId: string, name: string, files: string[]) => ({
  itemId,
  name,
  level: 2,
  hierarchyPath: [],
  files,
})

function bare(over: Partial<ProjectOverviewData> = {}): ProjectOverviewData {
  return {
    formatVersion: 3,
    projectId: 'p',
    purpose: claim('A thing.', ['c4_root'], 'derived'),
    capabilities: [],
    modules: [],
    documentWork: [],
    documentWorkStatus: claim('No plan documents were found.', [], 'abstain'),
    provenance: { source: 'heuristic', refreshedAt: '2026-10-22T07:00:00.000Z', contentKey: 'k' },
    ...over,
  }
}

function full(): ProjectOverviewData {
  return bare({
    purpose: claim('Plays tabletop battles.', ['c4_root'], 'derived'),
    purposeModelWritten: { refreshedAt: '2026-10-23T09:00:00.000Z', stale: false },
    capabilities: [
      {
        id: 'area:src/rules/',
        name: 'Resolve attacks',
        claim: claim('Rolls dice and applies wounds.', ['area:src/rules/', 'u_attack']),
        modelWritten: { refreshedAt: '2026-10-23T09:05:00.000Z', stale: true },
      },
      {
        id: 'area:src/ai/',
        name: 'ai',
        claim: claim('4 files: plan.ts and 3 more.', ['area:src/ai/', 'gone_id']),
      },
    ],
    modules: [
      {
        id: 'area:src/',
        name: 'src',
        claim: claim('12 files.', ['area:src/', 'u_main', 'u_main_again', 'u_a', 'u_b', 'u_c']),
      },
    ],
    recordedWork: {
      stories: [
        {
          id: 's1',
          name: 'Hot-seat play',
          status: 'in_progress',
          claim: claim('Hot-seat play (in_progress)', ['s1']),
          features: [
            {
              id: 'f1',
              name: 'Turn handover',
              status: 'pending',
              claim: claim('Turn handover (pending)', ['f1']),
            },
          ],
          openFeatures: 3,
        },
        {
          id: 's2',
          name: 'Campaign map',
          status: 'blocked',
          claim: claim('Campaign map (blocked)', ['s2']),
          features: [],
          openFeatures: 0,
        },
      ],
      openStories: 3,
      totalStories: 7,
    },
    documentWork: [
      {
        id: 'w1',
        name: 'Native diff viewer',
        claim: claim('Native diff viewer', ['doc_plan']),
        source: { attachmentId: 'doc_plan', reference: 'docs/plan.md', line: 270 },
      },
      {
        id: 'w2',
        name: 'Side panel',
        parentId: 'w1',
        claim: claim('Side panel', ['doc_plan']),
        source: { attachmentId: 'doc_plan' },
      },
      {
        id: 'w3',
        name: 'Drag handle',
        parentId: 'w2',
        claim: claim('Drag handle', ['ticket']),
        source: { attachmentId: 'ticket', reference: 'PROJ-12' },
      },
      {
        id: 'w4',
        name: 'Loose idea',
        claim: claim('Loose idea', []),
        source: { attachmentId: 'unknown' },
      },
    ],
    documentWorkStatus: claim('Work extracted from recorded lists; not a live tracker status.', [
      'doc_plan',
    ]),
    omitted: { capabilities: 4, modules: 0, documentWork: 1 },
    citations: {
      c4_root: area('c4_root', 'game', ['a.ts', 'b.ts']),
      'area:src/rules/': area('area:src/rules/', 'rules', ['src/rules/attack.ts']),
      u_attack: file('u_attack', 'resolveAttack', 'src/rules/attack.ts', 12),
      'area:src/ai/': area('area:src/ai/', 'ai', ['src/ai/plan.ts', 'src/ai/move.ts']),
      u_main: file('u_main', 'main', 'src/main.ts', 3),
      u_main_again: file('u_main_again', 'main', 'src/main.ts', 3),
      u_a: file('u_a', 'a', 'src/a.ts'),
      u_b: file('u_b', 'b', 'src/b.ts'),
      u_c: file('u_c', 'c', 'src/c.ts'),
      doc_plan: { ...file('doc_plan', 'plan.md', 'docs/plan.md'), sourceKind: 'attachment' },
    },
    sections: {
      purpose: fresh('2026-10-23T09:00:00.000Z'),
      capabilities: fresh('2026-10-23T09:05:00.000Z', true),
      modules: fresh('2026-10-23T08:00:00.000Z'),
      recordedWork: fresh('2026-10-23T08:10:00.000Z'),
      documentWork: fresh('2026-10-23T08:20:00.000Z'),
    },
    provenance: { source: 'llm', refreshedAt: '2026-10-23T09:05:00.000Z', contentKey: 'k' },
  })
}

const loaded = (data: ProjectKnowledgeOverview) => ({ data, loaded: true, error: null })

const answer = (
  overview: ProjectOverviewData | null,
  map: KnowledgeMapStatus | null = null,
  hasCheckout = true,
): ProjectKnowledgeOverview => ({
  ...(overview ? { overview } : {}),
  ...(map ? { map } : {}),
  hasCheckout,
})

function sectionsOf(overview: ProjectOverviewData, map: KnowledgeMapStatus | null = null) {
  const view = knowledgeView(loaded(answer(overview, map)), FORMAT)
  if (view.kind !== 'overview') throw new Error(`expected an overview, got ${view.kind}`)
  return view
}

function section<K extends KnowledgeSectionView['kind']>(
  overview: ProjectOverviewData,
  id: KnowledgeSectionView['id'],
  kind: K,
): Extract<KnowledgeSectionView, { kind: K }> {
  const found = sectionsOf(overview).sections.find((s) => s.id === id)
  if (!found || found.kind !== kind) throw new Error(`no ${kind} section ${id}`)
  return found as Extract<KnowledgeSectionView, { kind: K }>
}

describe('knowledgeView — the overview', () => {
  it('shows every part in order, each with its own refresh time and staleness', () => {
    const view = sectionsOf(full())
    expect(
      view.sections.map((s) => [s.id, s.title, s.kind, s.refreshed, s.refreshedAt, s.stale]),
    ).toEqual([
      [
        'purpose',
        'Purpose',
        'claims',
        'Refreshed <2026-10-23T09:00>',
        '2026-10-23T09:00:00.000Z',
        false,
      ],
      [
        'capabilities',
        'Capabilities',
        'claims',
        'Refreshed <2026-10-23T09:05>',
        '2026-10-23T09:05:00.000Z',
        true,
      ],
      [
        'modules',
        'Main modules',
        'claims',
        'Refreshed <2026-10-23T08:00>',
        '2026-10-23T08:00:00.000Z',
        false,
      ],
      [
        'recordedWork',
        'Recorded work',
        'work',
        'Refreshed <2026-10-23T08:10>',
        '2026-10-23T08:10:00.000Z',
        false,
      ],
      [
        'documentWork',
        'Planned in documents',
        'planned',
        'Refreshed <2026-10-23T08:20>',
        '2026-10-23T08:20:00.000Z',
        false,
      ],
    ])
    expect(view.updating).toBeUndefined()
  })

  it('falls back to the overview’s own refresh time when it keeps no per-part freshness', () => {
    const view = sectionsOf(bare())
    for (const s of view.sections) {
      expect(s.refreshedAt).toBe('2026-10-22T07:00:00.000Z')
      expect(s.stale).toBe(false)
    }
  })

  it('marks a model-written purpose and capability with when, and says when it may be out of date', () => {
    const purpose = section(full(), 'purpose', 'claims')
    expect(purpose.rows).toEqual([
      {
        key: 'purpose',
        text: 'Plays tabletop battles.',
        quiet: false,
        model: {
          refreshedAt: '2026-10-23T09:00:00.000Z',
          when: '<2026-10-23T09:00>',
          label: 'Model · <2026-10-23T09:00>',
          stale: false,
          title: 'Written by a model, <2026-10-23T09:00>',
        },
        sources: [],
      },
    ])
    const capabilities = section(full(), 'capabilities', 'claims')
    expect(capabilities.rows[0]!.model).toEqual({
      refreshedAt: '2026-10-23T09:05:00.000Z',
      when: '<2026-10-23T09:05>',
      label: 'Model · <2026-10-23T09:05>',
      stale: true,
      title: 'Written by a model, <2026-10-23T09:05>. The code may have changed since.',
    })
    expect(capabilities.rows[1]!.model).toBeUndefined()
  })

  it('leaves the model mark off every entry read from the code', () => {
    const view = sectionsOf(
      bare({
        capabilities: [{ id: 'a', name: 'a', claim: claim('x', ['u']) }],
        modules: [{ id: 'm', name: 'm', claim: claim('y', ['u']) }],
      }),
    )
    for (const s of view.sections)
      if (s.kind === 'claims') for (const row of s.rows) expect(row.model).toBeUndefined()
  })

  it('lists the files an entry is read from, at their lines — never an id with no file behind it', () => {
    const capabilities = section(full(), 'capabilities', 'claims')
    expect(capabilities.rows.map((r) => [r.key, r.name, r.text, r.sources])).toEqual([
      [
        'area:src/rules/',
        'Resolve attacks',
        'Rolls dice and applies wounds.',
        [{ label: 'attack.ts:12', name: 'resolveAttack', path: 'src/rules/attack.ts', line: 12 }],
      ],
      ['area:src/ai/', 'ai', '4 files: plan.ts and 3 more.', []],
    ])
  })

  it('leaves the name off a file cited by its own name', () => {
    const modules = section(
      bare({
        modules: [{ id: 'm', name: 'm', claim: claim('x', ['doc']) }],
        citations: { doc: file('doc', 'plan.md', 'docs/plan.md') },
      }),
      'modules',
      'claims',
    )
    expect(modules.rows[0]!.sources).toEqual([{ label: 'plan.md', path: 'docs/plan.md' }])
  })

  it('names each file once and at most three per entry', () => {
    const modules = section(full(), 'modules', 'claims')
    expect(modules.rows[0]!.sources).toEqual([
      { label: 'main.ts:3', name: 'main', path: 'src/main.ts', line: 3 },
      { label: 'a.ts', name: 'a', path: 'src/a.ts' },
      { label: 'b.ts', name: 'b', path: 'src/b.ts' },
    ])
  })

  it('says how many entries it left out, and nothing when it left none', () => {
    const view = sectionsOf(full())
    expect(view.sections.map((s) => s.more)).toEqual([
      undefined,
      'And 4 more capabilities',
      undefined,
      'And 1 more open story',
      'And 1 more work item',
    ])
    expect(sectionsOf(bare()).sections.every((s) => s.more === undefined)).toBe(true)
    const one = sectionsOf(bare({ omitted: { capabilities: 1, modules: 1, documentWork: 0 } }))
    expect(one.sections.map((s) => s.more)).toEqual([
      undefined,
      'And 1 more capability',
      'And 1 more module',
      undefined,
      undefined,
    ])
  })

  it('shows an abstained purpose quietly, as the overview could not say rather than as a failure', () => {
    const purpose = section(
      bare({ purpose: claim('No README says what this project is for.', [], 'abstain') }),
      'purpose',
      'claims',
    )
    expect(purpose.rows).toEqual([
      {
        key: 'purpose',
        text: 'No README says what this project is for.',
        quiet: true,
        sources: [],
      },
    ])
  })

  it('says quietly when the code shows no capabilities or modules yet', () => {
    const view = sectionsOf(bare())
    const [, capabilities, modules] = view.sections
    for (const s of [capabilities!, modules!]) {
      expect(s.kind === 'claims' && s.rows).toEqual([])
      expect(s.note).toEqual({ text: 'None found in the code yet.', quiet: true })
    }
  })

  it('counts open recorded stories and lists each with its open features as story chips', () => {
    const work = section(full(), 'recordedWork', 'work')
    expect(work.note).toEqual({ text: '3 open of 7 recorded stories', quiet: false })
    expect(work.stories).toEqual([
      {
        key: 's1',
        dependency: 's1',
        title: 'Hot-seat play',
        status: 'in_progress',
        features: [
          { key: 's1.f1', dependency: 's1.f1', title: 'Turn handover', status: 'pending' },
        ],
        more: 'And 2 more open features',
      },
      {
        key: 's2',
        dependency: 's2',
        title: 'Campaign map',
        status: 'blocked',
        features: [],
      },
    ])
  })

  it('says quietly when no stories are recorded, and when recorded work is not known', () => {
    const none = section(
      bare({ recordedWork: { stories: [], openStories: 0, totalStories: 0 } }),
      'recordedWork',
      'work',
    )
    expect(none.note).toEqual({ text: 'No stories recorded yet.', quiet: true })
    expect(none.stories).toEqual([])
    const allClosed = section(
      bare({ recordedWork: { stories: [], openStories: 0, totalStories: 1 } }),
      'recordedWork',
      'work',
    )
    expect(allClosed.note).toEqual({ text: '0 open of 1 recorded story', quiet: false })
    const unknown = section(bare(), 'recordedWork', 'work')
    expect(unknown.note).toEqual({ text: 'Not known yet.', quiet: true })
    expect(unknown.stories).toEqual([])
  })

  it('lists planned work under the work it belongs to, each opened where it is written', () => {
    const planned = section(full(), 'documentWork', 'planned')
    expect(planned.note).toEqual({
      text: 'Work extracted from recorded lists; not a live tracker status.',
      quiet: true,
    })
    expect(planned.items).toEqual([
      {
        key: 'w1',
        text: 'Native diff viewer',
        depth: 0,
        source: { label: 'plan.md:270', path: 'docs/plan.md', line: 270 },
      },
      {
        key: 'w2',
        text: 'Side panel',
        depth: 1,
        source: { label: 'plan.md', path: 'docs/plan.md' },
      },
      { key: 'w3', text: 'Drag handle', depth: 2, source: { label: 'PROJ-12' } },
      { key: 'w4', text: 'Loose idea', depth: 0 },
    ])
  })

  it('says quietly when no documents plan any work', () => {
    const planned = section(bare(), 'documentWork', 'planned')
    expect(planned.items).toEqual([])
    expect(planned.note).toEqual({ text: 'No plan documents were found.', quiet: true })
  })

  it('keeps the overview in view while the map is built again, with a quiet line', () => {
    const view = sectionsOf(full(), { projectId: 'p', state: 'building', percent: 10 })
    expect(view.updating).toBe('Building the map again. The overview follows.')
    expect(sectionsOf(full(), { projectId: 'p', state: 'queued' }).updating).toBeUndefined()
  })
})

describe('knowledgeView — no overview to show', () => {
  it('says it is reading until the first read finishes', () => {
    expect(knowledgeView({ data: undefined, loaded: false, error: null }, FORMAT)).toEqual({
      kind: 'loading',
      title: 'Reading the overview…',
    })
  })

  it('says why a read failed, with a retry', () => {
    expect(
      knowledgeView({ data: undefined, loaded: true, error: 'Network Error' }, FORMAT),
    ).toEqual({
      kind: 'error',
      title: "Couldn't read the overview",
      message: 'Network Error',
      retry: 'Try again',
    })
  })

  it('keeps showing what it read when a later read fails', () => {
    const view = knowledgeView(
      { data: answer(full()), loaded: true, error: 'Network Error' },
      FORMAT,
    )
    expect(view.kind).toBe('overview')
  })

  it('says a project with no checkout here cannot be read', () => {
    expect(knowledgeView(loaded(answer(null, null, false)), FORMAT)).toEqual({
      kind: 'empty',
      reason: 'no-checkout',
      title: 'Not on this machine',
      body: "This project has no checkout here, so its code can't be read.",
    })
  })

  it('says where a queued map stands', () => {
    const ahead = knowledgeView(
      loaded(answer(null, { projectId: 'p', state: 'queued', queuePosition: 3 })),
      FORMAT,
    )
    expect(ahead).toMatchObject({
      reason: 'queued',
      title: 'Map queued',
      body: '2 projects ahead of it. The overview follows once its map is built.',
    })
    const next = knowledgeView(
      loaded(answer(null, { projectId: 'p', state: 'queued', queuePosition: 1 })),
      FORMAT,
    )
    expect(next).toMatchObject({ body: 'Its map is built next. The overview follows.' })
    const unplaced = knowledgeView(
      loaded(answer(null, { projectId: 'p', state: 'queued' })),
      FORMAT,
    )
    expect(unplaced).toMatchObject({ body: 'Its map is built next. The overview follows.' })
  })

  it('says how far a build has gone, and how long is left when it is known', () => {
    const known = knowledgeView(
      loaded(
        answer(null, {
          projectId: 'p',
          state: 'building',
          percent: 40,
          elapsedMs: 30_000,
          expectedMs: 90_000,
        }),
      ),
      FORMAT,
    )
    expect(known).toEqual({
      kind: 'empty',
      reason: 'building',
      title: 'Building the map',
      body: '40% done · about 60s left. The overview follows.',
      percent: 40,
    })
    const overdue = knowledgeView(
      loaded(
        answer(null, {
          projectId: 'p',
          state: 'building',
          percent: 95,
          elapsedMs: 120_000,
          expectedMs: 90_000,
        }),
      ),
      FORMAT,
    )
    expect(overdue).toMatchObject({ body: '95% done. The overview follows.', percent: 95 })
    const first = knowledgeView(
      loaded(answer(null, { projectId: 'p', state: 'building', elapsedMs: 30_000 })),
      FORMAT,
    )
    expect(first).toEqual({
      kind: 'empty',
      reason: 'building',
      title: 'Building the map',
      body: 'Started 30s ago. The overview follows.',
    })
  })

  it('says a build failed and why, as the upkeep reported it', () => {
    expect(
      knowledgeView(
        loaded(
          answer(null, {
            projectId: 'p',
            state: 'failed',
            lastError: 'Timed out after 10 minutes.',
          }),
        ),
        FORMAT,
      ),
    ).toMatchObject({
      reason: 'failed',
      title: "The map couldn't be built",
      body: 'Timed out after 10 minutes. It is tried again on the next pass.',
    })
    expect(
      knowledgeView(loaded(answer(null, { projectId: 'p', state: 'failed' })), FORMAT),
    ).toMatchObject({ body: 'It is tried again on the next pass.' })
  })

  it('says there is no overview yet when the map is built or the upkeep has not reached it', () => {
    for (const map of [null, { projectId: 'p', state: 'idle' as const }]) {
      expect(knowledgeView(loaded(answer(null, map)), FORMAT)).toEqual({
        kind: 'empty',
        reason: 'none',
        title: 'No overview yet',
        body: "It is written once the project's map is built.",
      })
    }
  })

  it('writes times with the platform’s own formatter when none is given', () => {
    const view = knowledgeView(loaded(answer(full())))
    expect(view.kind === 'overview' && view.sections[0]!.refreshed).toMatch(/^Refreshed \S/)
  })
})

describe('knowledgeTextParts', () => {
  it('splits code spans written in backticks from the text around them', () => {
    expect(knowledgeTextParts('`DiffViewer` / `MergeConflictResolver` native peers')).toEqual([
      { text: 'DiffViewer', code: true },
      { text: ' / ', code: false },
      { text: 'MergeConflictResolver', code: true },
      { text: ' native peers', code: false },
    ])
  })

  it('keeps plain text whole, and an unclosed or empty backtick as written', () => {
    expect(knowledgeTextParts('Rolls dice.')).toEqual([{ text: 'Rolls dice.', code: false }])
    expect(knowledgeTextParts('a ` b')).toEqual([{ text: 'a ` b', code: false }])
    expect(knowledgeTextParts('a `` b')).toEqual([{ text: 'a `` b', code: false }])
    expect(knowledgeTextParts('')).toEqual([])
  })
})
