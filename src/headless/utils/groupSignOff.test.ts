import { describe, expect, it } from 'vitest'
import type { ProcessPlan, ProcessRun } from 'thefactory-tools/types'

import {
  groupSignOffAnswers,
  groupSignOffPhase,
  groupSignOffScreen,
  signOffAttachmentFileName,
  signOffOutputChips,
  signOffOutputProblem,
  signOffOutputSegments,
  signOffOutputUnfilled,
  signOffSectionKey,
  settleSignOffDrafts,
} from './groupSignOff'
import { SIGN_OFF_OUTPUT_MAX_CHARS } from './groupSignOffConstants'
import { isHeldForGroupSignOff } from './groupSignOffHold'
import type {
  GroupSignOffData,
  GroupSignOffRepo,
  GroupSignOffState,
  SignOffOutputDocument,
  SignOffOutputDraft,
} from './groupSignOffTypes'

const repo = (projectId: string, over: Partial<GroupSignOffRepo> = {}): GroupSignOffRepo => ({
  legId: projectId,
  projectId,
  title: `${projectId} story`,
  status: 'at-sign-off',
  runId: `run-${projectId}`,
  branch: `work/${projectId}`,
  baseRef: 'main',
  evidence: [],
  pullRequest: { state: 'to-open', title: 'Add it', files: ['a.ts', 'b.ts'], generated: [] },
  ...over,
})

const data = (over: Partial<GroupSignOffData> = {}): GroupSignOffData => ({
  groupRunId: 'g1',
  title: 'ENG-1 Renewal date',
  status: 'parked',
  canDecide: true,
  canRetry: false,
  canEditOutputs: true,
  tickets: [],
  repos: [repo('be'), repo('web')],
  outputs: [],
  goingLive: { steps: [], words: '' },
  walkthrough: [],
  attachments: [],
  ...over,
})

const nameOf = (id: string) => (id === 'be' ? 'Backend' : id)

const state = (over: Partial<GroupSignOffState> = {}): GroupSignOffState => ({
  data: undefined,
  readError: null,
  acting: undefined,
  actionError: null,
  documents: {},
  documentErrors: {},
  drafts: {},
  saving: [],
  fetches: {},
  ...over,
})

const doc = (evidenceId: string, text: string, projectId = 'be'): SignOffOutputDocument => ({
  evidenceId,
  projectId,
  label: 'PR Text',
  text,
  editable: true,
})

describe('isHeldForGroupSignOff', () => {
  const plan = {
    steps: [{ id: 'sign', name: 'Sign off', kind: 'gate', signOff: true }],
  } as unknown as ProcessPlan
  const held = (input: Record<string, unknown> | undefined, stepId = 'sign'): ProcessRun =>
    ({ status: 'parked', park: { reason: 'gate', stepId }, plan, input }) as unknown as ProcessRun

  it('holds an on-branch leg at its sign-off gate, and nothing else', () => {
    expect(isHeldForGroupSignOff(held({ groupBuildMode: 'on-branch' }))).toBe(true)
    expect(isHeldForGroupSignOff(held({ groupBuildMode: 'merge-first' }))).toBe(false)
    expect(isHeldForGroupSignOff(held(undefined))).toBe(false)
    expect(isHeldForGroupSignOff(held({ groupBuildMode: 'on-branch' }, 'other'))).toBe(false)
    expect(
      isHeldForGroupSignOff({
        ...held({ groupBuildMode: 'on-branch' }),
        status: 'running',
      }),
    ).toBe(false)
  })
})

describe('groupSignOffPhase', () => {
  it('is deciding while the group waits for its decision', () => {
    expect(groupSignOffPhase(data())).toBe('deciding')
  })

  it('is building until every repo is finished', () => {
    expect(
      groupSignOffPhase(
        data({
          canDecide: false,
          status: 'running',
          repos: [repo('be'), repo('web', { pullRequest: { state: 'waiting' } })],
        }),
      ),
    ).toBe('building')
  })

  it.each(['opening', 'opened', 'failed', 'by-hand', 'merged'] as const)(
    'is submitted once a repo is %s',
    (prState) => {
      expect(
        groupSignOffPhase(
          data({
            canDecide: false,
            canEditOutputs: false,
            repos: [repo('be', { pullRequest: { state: prState } })],
          }),
        ),
      ).toBe('submitted')
    },
  )

  it('is submitted when an approval left every repo out', () => {
    expect(
      groupSignOffPhase(
        data({
          canDecide: false,
          canEditOutputs: false,
          status: 'succeeded',
          repos: [repo('be', { pullRequest: { state: 'left-out', leftOut: 'No changes.' } })],
        }),
      ),
    ).toBe('submitted')
  })

  it('has ended for rejected work and a stopped group, not for a submitted one that failed', () => {
    const decided = { canDecide: false, canEditOutputs: false }
    expect(
      groupSignOffPhase(
        data({
          ...decided,
          repos: [repo('be', { status: 'rejected', pullRequest: { state: 'waiting' } })],
        }),
      ),
    ).toBe('ended')
    expect(
      groupSignOffPhase(
        data({
          ...decided,
          status: 'cancelled',
          repos: [repo('be', { pullRequest: { state: 'waiting' } })],
        }),
      ),
    ).toBe('ended')
    expect(
      groupSignOffPhase(
        data({
          ...decided,
          status: 'failed',
          repos: [repo('be', { pullRequest: { state: 'failed', error: 'no' } })],
        }),
      ),
    ).toBe('submitted')
  })
})

describe('groupSignOffScreen', () => {
  const rowOf = (over: GroupSignOffRepo['pullRequest']) =>
    groupSignOffScreen(data({ repos: [repo('be', { pullRequest: over })] }), state(), nameOf)
      .repos[0]!

  it('names a repo, its branch and its pull request', () => {
    const row = rowOf({ state: 'to-open', title: 'Add it', files: ['a'], generated: ['g', 'h'] })
    expect(row).toMatchObject({
      name: 'Backend',
      storyTitle: 'be story',
      branchLine: 'work/be → main',
      prTitle: 'Add it',
      filesLine: '1 file, 2 generated left out',
      badge: { label: 'Gets a pull request', tone: 'review' },
    })
  })

  it('leaves the branch line out for a repo with no branch', () => {
    const screen = groupSignOffScreen(
      data({ repos: [repo('be', { branch: undefined, baseRef: undefined })] }),
      state(),
      nameOf,
    )
    expect(screen.repos[0]!.branchLine).toBeUndefined()
  })

  it('says why a repo is left out, with no count of files it does not open', () => {
    const row = rowOf({
      state: 'left-out',
      leftOut: 'Only generated files changed.',
      files: [],
      generated: ['g'],
    })
    expect(row).toMatchObject({
      badge: { label: 'No pull request' },
      line: 'Only generated files changed.',
    })
    expect(row.filesLine).toBeUndefined()
  })

  it('offers a by-hand repo’s compare link as the way to open it', () => {
    const row = rowOf({ state: 'by-hand', compareUrl: 'https://git.example.com/compare/a...b' })
    expect(row.link).toEqual({
      label: 'Open it on the host',
      url: 'https://git.example.com/compare/a...b',
    })
    expect(row.line).toContain('Open it from here')
  })

  it('links an opened pull request and shows a spinner only while opening', () => {
    expect(rowOf({ state: 'opened', url: 'https://github.com/o/r/pull/1' }).link?.url).toBe(
      'https://github.com/o/r/pull/1',
    )
    expect(rowOf({ state: 'opening' }).busy).toBe(true)
    expect(rowOf({ state: 'opened' }).busy).toBe(false)
  })

  it('never makes a link of anything but http or https', () => {
    expect(rowOf({ state: 'opened', url: 'javascript:alert(1)' }).link).toBeUndefined()
    expect(rowOf({ state: 'by-hand', compareUrl: 'not a url' }).link).toBeUndefined()
  })

  it('says why a repo failed or could not be read', () => {
    expect(rowOf({ state: 'failed', error: 'Token expired.' }).error).toBe('Token expired.')
    expect(rowOf({ state: 'unread', error: 'No checkout.' })).toMatchObject({
      error: 'No checkout.',
      line: expect.stringContaining('could not be read'),
    })
  })

  it('counts the pull requests the decision opens', () => {
    const screen = groupSignOffScreen(
      data({
        repos: [
          repo('be'),
          repo('web'),
          repo('docs', { pullRequest: { state: 'left-out', leftOut: 'No changes.' } }),
        ],
      }),
      state(),
      nameOf,
    )
    expect(screen.plan).toBe('Approving opens 2 pull requests.')
    expect(screen.choices.map((c) => c.choice)).toEqual(['approve', 'request-changes', 'reject'])
    expect(screen.choices[0]!.detail).toContain('Opens 2 pull requests')
  })

  it('says so when the decision opens none', () => {
    const screen = groupSignOffScreen(
      data({ repos: [repo('be', { pullRequest: { state: 'left-out' } })] }),
      state(),
      nameOf,
    )
    expect(screen.plan).toContain('no pull request')
  })

  it('offers no answers once decided, and tells where it stands', () => {
    const screen = groupSignOffScreen(
      data({
        canDecide: false,
        canEditOutputs: false,
        repos: [
          repo('be', { pullRequest: { state: 'opened', url: 'https://github.com/o/r/pull/1' } }),
          repo('web', { pullRequest: { state: 'opening' } }),
          repo('docs', { pullRequest: { state: 'left-out' } }),
        ],
      }),
      state(),
      nameOf,
    )
    expect(screen.choices).toEqual([])
    expect(screen.plan).toBeUndefined()
    expect(screen.line).toBe('1 of 2 pull requests open.')
    expect(screen.badge.label).toBe('Opening')
  })

  it('shows a failed submission as needing a retry, and offers one only when it can run', () => {
    const failed = data({
      canDecide: false,
      canEditOutputs: false,
      repos: [repo('be', { pullRequest: { state: 'failed', error: 'no' } })],
    })
    expect(groupSignOffScreen({ ...failed, canRetry: true }, state(), nameOf)).toMatchObject({
      badge: { label: 'Needs a retry' },
      canRetry: true,
    })
    expect(groupSignOffScreen(failed, state(), nameOf).canRetry).toBe(false)
  })

  it('counts a by-hand repo among the pull requests still to open', () => {
    const screen = groupSignOffScreen(
      data({
        canDecide: false,
        canEditOutputs: false,
        repos: [
          repo('be', { pullRequest: { state: 'opened', url: 'https://github.com/o/r/pull/1' } }),
          repo('web', { pullRequest: { state: 'by-hand' } }),
        ],
      }),
      state(),
      nameOf,
    )
    expect(screen.line).toBe('1 of 2 pull requests open.')
    expect(screen.badge.label).toBe('Submitted')
  })

  it('says how far a building group has come', () => {
    const screen = groupSignOffScreen(
      data({
        canDecide: false,
        status: 'running',
        repos: [
          repo('be'),
          repo('web', { status: 'running', pullRequest: { state: 'waiting' } }),
          repo('docs', { status: 'blocked', pullRequest: { state: 'waiting' } }),
        ],
      }),
      state(),
      nameOf,
    )
    expect(screen.line).toContain('1 of 3 repos finished')
  })

  it('lets changes be requested only of a repo at its sign-off', () => {
    const screen = groupSignOffScreen(
      data({ repos: [repo('be'), repo('web', { status: 'integrated' })] }),
      state(),
      nameOf,
    )
    expect(screen.sendBack.map((r) => r.legId)).toEqual(['be'])
  })

  it('gives each ticket a chip, and states the order to go live', () => {
    const screen = groupSignOffScreen(
      data({
        tickets: [
          { provider: 'jira', externalId: 'ENG-1', url: 'https://x.atlassian.net/browse/ENG-1' },
        ],
        goingLive: { steps: [], words: 'Merge be first, then web.' },
      }),
      state(),
      nameOf,
    )
    expect(screen.tickets[0]).toMatchObject({ key: 'ENG-1' })
    expect(screen.goingLive).toBe('Merge be first, then web.')
  })

  it('has no going-live line when it says nothing', () => {
    expect(groupSignOffScreen(data(), state(), nameOf).goingLive).toBeUndefined()
  })

  it('lists what to attach: a file to fetch and a link to open', () => {
    const screen = groupSignOffScreen(
      data({
        attachments: [
          {
            evidenceId: 'e1',
            projectId: 'be',
            kind: 'screenshot',
            name: 'Plan page',
            mediaType: 'image/png',
            downloadPath: '/projects/be/review-evidence/e1/content?download=true',
          },
          {
            evidenceId: 'e2',
            projectId: 'web',
            kind: 'link',
            name: 'Walkthrough',
            url: 'https://www.loom.com/share/1',
          },
          { evidenceId: 'e3', projectId: 'web', kind: 'link', name: 'Bad', url: 'file:///etc' },
        ],
      }),
      state({ fetches: { e1: { busy: true }, e3: { busy: false, error: 'nope' } } }),
      nameOf,
    )
    expect(screen.attachments[0]).toMatchObject({
      name: 'Plan page',
      projectName: 'Backend',
      kindLabel: 'Screenshot',
      busy: true,
    })
    expect(screen.attachments[0]!.link).toBeUndefined()
    expect(screen.attachments[1]!.link).toEqual({
      label: 'Open',
      url: 'https://www.loom.com/share/1',
    })
    expect(screen.attachments[2]!.link).toBeUndefined()
    expect(screen.attachments[2]!.error).toBe('nope')
  })

  it('counts the Loom items with no recording', () => {
    const item = {
      id: 'i',
      projectId: 'be',
      evidenceId: 'e',
      title: 't',
      open: 'o',
      steps: [],
      mustShow: [],
    }
    const screen = groupSignOffScreen(
      data({
        walkthrough: [
          item,
          { ...item, id: 'j', result: { kind: 'link', url: 'https://l/1', evidenceId: 'r' } },
        ],
      }),
      state(),
      nameOf,
    )
    expect(screen.loomLeft).toBe(1)
  })

  it('names each output with an edit not saved, once', () => {
    const outputs = [
      {
        label: 'PR Text',
        perRepo: true,
        sections: [
          { projectId: 'be', evidenceId: 'a' },
          { projectId: 'web', evidenceId: 'b' },
        ],
      },
      { label: 'Slack Message', perRepo: false, sections: [{ projectId: 'be', evidenceId: 'c' }] },
    ]
    const draft = { text: 'x', baseEvidenceId: 'a' }
    const screen = groupSignOffScreen(
      data({ outputs }),
      state({
        drafts: {
          [signOffSectionKey('PR Text', 'be')]: draft,
          [signOffSectionKey('PR Text', 'web')]: draft,
        },
      }),
      nameOf,
    )
    expect(screen.unsaved).toEqual(['PR Text'])
  })
})

describe('groupSignOffAnswers', () => {
  it('leads with Approve, and Reject asks about every repo first', () => {
    const screen = groupSignOffScreen(data(), state(), nameOf)
    const view = groupSignOffAnswers(screen.choices)
    expect(view.lead?.choice).toBe('approve')
    expect(view.others.map((a) => a.choice)).toEqual(['request-changes'])
    expect(view.minor[0]).toMatchObject({
      choice: 'reject',
      confirm: { text: expect.stringContaining('every repo') },
    })
  })

  it('puts the answer picked in front', () => {
    const screen = groupSignOffScreen(data(), state(), nameOf)
    expect(groupSignOffAnswers(screen.choices, 'request-changes').lead?.choice).toBe(
      'request-changes',
    )
  })
})

describe('signOffOutputSegments', () => {
  it('splits out each placeholder, in order', () => {
    expect(signOffOutputSegments('Ticket {{ticket}}: see {{pr:be}}.')).toEqual([
      { text: 'Ticket ', unfilled: false },
      { text: '{{ticket}}', unfilled: true },
      { text: ': see ', unfilled: false },
      { text: '{{pr:be}}', unfilled: true },
      { text: '.', unfilled: false },
    ])
  })

  it('leaves text with none whole, and an empty text empty', () => {
    expect(signOffOutputSegments('All filled.')).toEqual([{ text: 'All filled.', unfilled: false }])
    expect(signOffOutputSegments('')).toEqual([])
  })

  it('stands out a placeholder at either end, spaced or one the template made up', () => {
    expect(signOffOutputSegments('{{ loom }} then {{owner}}')).toEqual([
      { text: '{{ loom }}', unfilled: true },
      { text: ' then ', unfilled: false },
      { text: '{{owner}}', unfilled: true },
    ])
  })

  it('leaves braces that are no placeholder alone', () => {
    expect(signOffOutputSegments('{ "a": {} } and {{\n}}')).toEqual([
      { text: '{ "a": {} } and {{\n}}', unfilled: false },
    ])
  })
})

describe('signOffOutputUnfilled', () => {
  it('names each placeholder once', () => {
    expect(signOffOutputUnfilled('{{loom}} and {{pr:be}} and {{loom}}')).toEqual([
      '{{loom}}',
      '{{pr:be}}',
    ])
    expect(signOffOutputUnfilled('none')).toEqual([])
  })
})

describe('signOffOutputProblem', () => {
  it('takes one to the most characters the route takes', () => {
    expect(signOffOutputProblem('x')).toBeUndefined()
    expect(signOffOutputProblem('x'.repeat(SIGN_OFF_OUTPUT_MAX_CHARS))).toBeUndefined()
    expect(signOffOutputProblem('')).toBe('Write something first.')
    expect(signOffOutputProblem('   \n')).toBe('Write something first.')
    expect(signOffOutputProblem('x'.repeat(SIGN_OFF_OUTPUT_MAX_CHARS + 1))).toContain('200,000')
  })
})

describe('signOffAttachmentFileName', () => {
  it('keeps a name that has its extension', () => {
    expect(signOffAttachmentFileName({ name: 'plan.png', mediaType: 'image/png' })).toBe('plan.png')
  })

  it('makes a label a file name, with the extension of its type', () => {
    expect(signOffAttachmentFileName({ name: 'Plan page, after', mediaType: 'image/png' })).toBe(
      'plan-page-after.png',
    )
    expect(signOffAttachmentFileName({ name: 'Run', mediaType: 'image/svg+xml' })).toBe('run.svg')
  })

  it('still names a file with no type and nothing to slug', () => {
    expect(signOffAttachmentFileName({ name: '…' })).toBe('attachment')
  })
})

describe('signOffOutputChips', () => {
  const outputs = [
    {
      label: 'PR Text',
      perRepo: true,
      sections: [
        { projectId: 'be', evidenceId: 'a' },
        { projectId: 'web', evidenceId: 'b' },
      ],
    },
    { label: 'Slack Message', perRepo: false, sections: [{ projectId: 'be', evidenceId: 'c' }] },
  ]

  it('is one chip per output, passed once written and filled', () => {
    const chips = signOffOutputChips(
      data({ outputs }),
      state({
        documents: { a: doc('a', 'one'), b: doc('b', 'two', 'web'), c: doc('c', 'post') },
      }),
      nameOf,
    )
    expect(chips.map((c) => [c.row.label, c.row.state, c.row.id])).toEqual([
      ['PR Text', 'passed', 'report'],
      ['Slack Message', 'passed', 'report'],
    ])
  })

  it('heads a per-repo section with its repo, and an output for all with nothing', () => {
    const chips = signOffOutputChips(data({ outputs }), state(), nameOf)
    expect(chips[0]!.panel.sections.map((s) => s.heading)).toEqual(['Backend', 'web'])
    expect(chips[1]!.panel.sections[0]!.heading).toBeUndefined()
  })

  it('counts what is still to fill, across sections, on the chip', () => {
    const chips = signOffOutputChips(
      data({ outputs }),
      state({
        documents: {
          a: doc('a', '{{pr:be}} {{ticket}}'),
          b: doc('b', '{{ticket}}', 'web'),
          c: doc('c', 'done'),
        },
      }),
      nameOf,
    )
    expect(chips[0]!.row).toMatchObject({ label: 'PR Text · 3 to fill', state: 'unchecked' })
    expect(chips[0]!.panel.sections[0]!.unfilled).toEqual(['{{pr:be}}', '{{ticket}}'])
    expect(chips[1]!.row).toMatchObject({ label: 'Slack Message', state: 'passed' })
  })

  it('says what is not written, and neither passes nor claims a read', () => {
    const chips = signOffOutputChips(
      data({
        outputs: [
          {
            label: 'PR Text',
            perRepo: true,
            sections: [{ projectId: 'be' }, { projectId: 'web', evidenceId: 'b' }],
          },
        ],
      }),
      state({ documents: { b: doc('b', 'two', 'web') } }),
      nameOf,
    )
    expect(chips[0]!.row).toMatchObject({ label: 'PR Text · 1 to write', state: 'unchecked' })
    expect(chips[0]!.panel.sections[0]).toMatchObject({
      written: false,
      loading: false,
      editable: false,
    })
  })

  it('is reading until the document comes, and says when it did not', () => {
    const key = signOffSectionKey('PR Text', 'be')
    const reading = signOffOutputChips(data({ outputs }), state(), nameOf)
    expect(reading[0]!.panel.sections[0]).toMatchObject({ loading: true, written: true })
    expect(reading[0]!.row.state).toBe('passed')
    const failed = signOffOutputChips(
      data({ outputs }),
      state({ documentErrors: { [key]: 'Gone.' } }),
      nameOf,
    )
    expect(failed[0]!.panel.sections[0]).toMatchObject({ loading: false, error: 'Gone.' })
  })

  it('offers an edit only while outputs can change', () => {
    const documents = { a: doc('a', 'one'), b: doc('b', 'two', 'web'), c: doc('c', 'post') }
    expect(
      signOffOutputChips(data({ outputs }), state({ documents }), nameOf)[0]!.panel.sections[0]!
        .editable,
    ).toBe(true)
    expect(
      signOffOutputChips(data({ outputs, canEditOutputs: false }), state({ documents }), nameOf)[0]!
        .panel.sections[0]!.editable,
    ).toBe(false)
  })

  it('shows an edit with what stands in its way', () => {
    const key = signOffSectionKey('PR Text', 'be')
    const view = (draft: SignOffOutputDraft, saving: string[] = []) =>
      signOffOutputChips(
        data({ outputs }),
        state({ documents: { a: doc('a', 'one') }, drafts: { [key]: draft }, saving }),
        nameOf,
      )[0]!.panel.sections[0]!.draft
    expect(view({ text: 'mine', baseEvidenceId: 'a' })).toEqual({ text: 'mine', saving: false })
    expect(view({ text: 'mine', baseEvidenceId: 'a' }, [key])?.saving).toBe(true)
    expect(view({ text: '', baseEvidenceId: 'a' })?.problem).toBe('Write something first.')
    expect(view({ text: 'mine', baseEvidenceId: 'a', notice: 'changed' })?.notice).toEqual({
      kind: 'changed',
      text: expect.stringContaining('Your text is kept'),
    })
    expect(view({ text: 'mine', baseEvidenceId: 'a', notice: 'closed' })?.notice?.kind).toBe(
      'closed',
    )
    expect(view({ text: 'mine', baseEvidenceId: 'a', error: 'Nope.' })?.error).toBe('Nope.')
  })
})

describe('settleSignOffDrafts', () => {
  const key = signOffSectionKey('PR Text', 'be')
  const at = (evidenceId: string | undefined, over: Partial<GroupSignOffData> = {}) =>
    data({
      outputs: [
        {
          label: 'PR Text',
          perRepo: true,
          sections: [{ projectId: 'be', ...(evidenceId ? { evidenceId } : {}) }],
        },
      ],
      ...over,
    })
  const documents = { a: doc('a', 'original') }

  it('leaves an edit on the version that still stands', () => {
    const draft = { text: 'mine', baseEvidenceId: 'a' }
    expect(settleSignOffDrafts({ [key]: draft }, at('a'), documents)).toEqual({ [key]: draft })
  })

  it('keeps the text and tells the person when the version moved on', () => {
    expect(
      settleSignOffDrafts({ [key]: { text: 'mine', baseEvidenceId: 'a' } }, at('b'), documents),
    ).toEqual({ [key]: { text: 'mine', baseEvidenceId: 'a', notice: 'changed' } })
  })

  it('keeps the text and tells the person when the sign-off was decided', () => {
    expect(
      settleSignOffDrafts(
        { [key]: { text: 'mine', baseEvidenceId: 'a' } },
        at('a', { canEditOutputs: false }),
        documents,
      ),
    ).toEqual({ [key]: { text: 'mine', baseEvidenceId: 'a', notice: 'closed' } })
  })

  it('says decided over changed when both happened', () => {
    expect(
      settleSignOffDrafts(
        { [key]: { text: 'mine', baseEvidenceId: 'a' } },
        at('b', { canEditOutputs: false }),
        documents,
      )[key]?.notice,
    ).toBe('closed')
  })

  it('keeps an edit whose section went away', () => {
    expect(
      settleSignOffDrafts(
        { [key]: { text: 'mine', baseEvidenceId: 'a' } },
        data({ outputs: [] }),
        documents,
      )[key],
    ).toMatchObject({ text: 'mine', notice: 'changed' })
  })

  it('drops an edit that changed nothing, as there is nothing to lose', () => {
    expect(
      settleSignOffDrafts({ [key]: { text: 'original', baseEvidenceId: 'a' } }, at('b'), documents),
    ).toEqual({})
  })

  it('keeps an edit whose first version was never read', () => {
    expect(
      settleSignOffDrafts({ [key]: { text: 'original', baseEvidenceId: 'x' } }, at('b'), {}),
    ).toMatchObject({ [key]: { notice: 'changed' } })
  })

  it('clears the notice once the edit stands on the current version again', () => {
    expect(
      settleSignOffDrafts(
        { [key]: { text: 'mine', baseEvidenceId: 'a', notice: 'closed' } },
        at('a'),
        documents,
      ),
    ).toEqual({ [key]: { text: 'mine', baseEvidenceId: 'a' } })
  })

  it('keeps a save’s error through a read that changed nothing', () => {
    const draft = { text: 'mine', baseEvidenceId: 'a', error: 'Nope.' }
    expect(settleSignOffDrafts({ [key]: draft }, at('a'), documents)).toEqual({ [key]: draft })
  })
})
