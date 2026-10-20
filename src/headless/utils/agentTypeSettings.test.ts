import { describe, expect, it } from 'vitest'
import type { ResolvedAgentType } from 'thefactory-tools/types'

import {
  agentTypeDraftOf,
  agentTypeDraftProblem,
  agentTypeSaveRequest,
  agentTypeSettingsView,
  agentTypeSlotsWith,
} from './agentTypeSettings'
import { AGENT_TYPE_DRAFT_PROBLEMS } from './agentTypeSettingsConstants'

const builtin = (role: ResolvedAgentType['baseRole']): ResolvedAgentType => ({
  id: role,
  label: role,
  scope: 'builtin',
  baseRole: role,
  contextDocs: [],
})
const TYPES: ResolvedAgentType[] = [
  builtin('developer'),
  builtin('verifier'),
  {
    id: 'code-quality-maintainer',
    label: 'Code quality maintainer',
    scope: 'project',
    baseRole: 'verifier',
    brief: 'Read the diff.',
    briefMode: 'replace',
    proves: false,
    tools: ['readFile', 'gitDiff'],
    contextDocs: ['docs/CODE_STANDARD.md'],
  },
  {
    id: 'screen-checker',
    label: 'Screen checker',
    scope: 'project',
    baseRole: 'verifier',
    contextDocs: [],
  },
  {
    id: 'web-builder',
    label: 'Web builder',
    scope: 'group',
    baseRole: 'developer',
    contextDocs: [],
  },
]

describe('agentTypeSettingsView — a project', () => {
  const view = agentTypeSettingsView(
    {
      agentTypes: TYPES,
      slotDefaults: { implementer: 'web-builder', verifier: 'screen-checker' },
      ownSlotDefaults: { verifier: 'screen-checker' },
      groupSlotDefaults: { implementer: 'web-builder' },
      groupId: 'web-team',
    },
    { kind: 'project', projectId: 'web' },
  )

  it('lists its own types to edit, its group’s to read, and the built-in roles apart', () => {
    expect(view.own.map((t) => [t.id, t.editable, t.scopeLabel])).toEqual([
      ['code-quality-maintainer', true, 'Project'],
      ['screen-checker', true, 'Project'],
    ])
    expect(view.inherited.map((t) => [t.id, t.editable])).toEqual([['web-builder', false]])
    expect(view.builtins.map((t) => t.label)).toEqual(['Developer', 'Verifier'])
    expect(view.own[0]).toMatchObject({
      notProving: true,
      briefMode: 'replace',
      tools: ['readFile', 'gitDiff'],
      contextDocs: ['docs/CODE_STANDARD.md'],
    })
  })

  it('shows each slot’s type, whether the project sets it or inherits it, and what it falls back to', () => {
    expect(
      view.slots.map((s) => [s.slot, s.value, s.effective.id, s.sourceLabel, s.fallbackLabel]),
    ).toEqual([
      ['implementer', undefined, 'web-builder', 'From group', 'Group default (Web builder)'],
      ['verifier', 'screen-checker', 'screen-checker', 'Project', 'Built-in'],
    ])
  })

  it('offers each slot only the types that may fill it', () => {
    expect(view.slots.map((s) => s.options.map((o) => o.id))).toEqual([
      ['developer', 'web-builder'],
      ['verifier', 'screen-checker'],
    ])
  })
})

describe('agentTypeSettingsView — a group', () => {
  it('lists its own types to edit, inherits nothing, and falls back to the built-in', () => {
    const view = agentTypeSettingsView(
      {
        agentTypes: [builtin('developer'), builtin('verifier'), { ...TYPES[4]! }],
        slotDefaults: { implementer: 'web-builder' },
      },
      { kind: 'group', groupId: 'web-team' },
    )
    expect(view.own.map((t) => [t.id, t.editable])).toEqual([['web-builder', true]])
    expect(view.inherited).toEqual([])
    expect(
      view.slots.map((s) => [s.value, s.effective.id, s.sourceLabel, s.fallbackLabel]),
    ).toEqual([
      ['web-builder', 'web-builder', 'Group', 'Built-in'],
      [undefined, 'verifier', 'Built-in', 'Built-in'],
    ])
  })
})

describe('agentTypeDraftOf and agentTypeSaveRequest', () => {
  it('starts a new type on the developer role, appending to its brief and proving', () => {
    expect(agentTypeDraftOf()).toEqual({
      id: '',
      label: '',
      description: '',
      baseRole: 'developer',
      brief: '',
      briefMode: 'append',
      proves: true,
      tools: '',
      contextDocs: '',
      isNew: true,
    })
  })

  it('edits a stored type with its lists one per line, and saves it back as it was', () => {
    const draft = agentTypeDraftOf(TYPES[2])
    expect(draft).toMatchObject({
      tools: 'readFile\ngitDiff',
      contextDocs: 'docs/CODE_STANDARD.md',
      proves: false,
      briefMode: 'replace',
      isNew: false,
    })
    expect(agentTypeSaveRequest(draft)).toEqual({
      id: 'code-quality-maintainer',
      body: {
        label: 'Code quality maintainer',
        baseRole: 'verifier',
        brief: 'Read the diff.',
        briefMode: 'replace',
        proves: false,
        tools: ['readFile', 'gitDiff'],
        contextDocs: ['docs/CODE_STANDARD.md'],
      },
    })
  })

  it('drops blank fields and lines, splits lists on commas too, and never sends proving on a role that does not prove', () => {
    expect(
      agentTypeSaveRequest({
        ...agentTypeDraftOf(),
        id: ' builder ',
        label: ' Builder ',
        description: '  ',
        tools: 'readFile, writeFile\n\n gitDiff ',
        contextDocs: '\n',
        proves: false,
      }),
    ).toEqual({
      id: 'builder',
      body: {
        label: 'Builder',
        baseRole: 'developer',
        tools: ['readFile', 'writeFile', 'gitDiff'],
      },
    })
  })
})

describe('agentTypeDraftProblem', () => {
  const draft = { ...agentTypeDraftOf(), id: 'builder', label: 'Builder' }

  it('passes a type that names itself', () => {
    expect(agentTypeDraftProblem(draft, ['screen-checker'])).toBeUndefined()
  })

  it.each([
    [{ id: ' ' }, AGENT_TYPE_DRAFT_PROBLEMS.id],
    [{ id: 'has space' }, AGENT_TYPE_DRAFT_PROBLEMS.id],
    [{ id: 'verifier' }, AGENT_TYPE_DRAFT_PROBLEMS.idBuiltin],
    [{ id: 'screen-checker' }, AGENT_TYPE_DRAFT_PROBLEMS.idTaken],
    [{ label: '  ' }, AGENT_TYPE_DRAFT_PROBLEMS.label],
    [{ briefMode: 'replace' as const, brief: ' ' }, AGENT_TYPE_DRAFT_PROBLEMS.brief],
  ])('says why %o will not save', (over, problem) => {
    expect(agentTypeDraftProblem({ ...draft, ...over }, ['screen-checker'])).toBe(problem)
  })

  it('lets a stored type keep its own id', () => {
    expect(
      agentTypeDraftProblem({ ...draft, id: 'screen-checker', isNew: false }, ['screen-checker']),
    ).toBeUndefined()
  })
})

describe('agentTypeSlotsWith', () => {
  it('sets one slot, or clears it so the slot falls back, leaving the others', () => {
    expect(agentTypeSlotsWith({ verifier: 'screen-checker' }, 'implementer', 'builder')).toEqual({
      verifier: 'screen-checker',
      implementer: 'builder',
    })
    expect(
      agentTypeSlotsWith({ verifier: 'screen-checker', implementer: 'b' }, 'verifier', undefined),
    ).toEqual({ implementer: 'b' })
  })
})
