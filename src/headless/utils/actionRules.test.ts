import { describe, expect, it } from 'vitest'
import {
  actionRuleCallSummary,
  actionRuleFilterOptions,
  actionRuleRowView,
  actionRuleTitle,
  chatActionRules,
  groupActionRules,
  removeActionRuleConfirm,
} from './actionRules'
import type { ActionRuleView } from './actionRulesTypes'
import { formatDateShort } from './time'

const rule = (over: Partial<ActionRuleView>): ActionRuleView => ({
  id: 'r',
  kind: 'tool-call',
  toolName: 'addFeature',
  covers: 'tool',
  scope: { kind: 'everywhere' },
  createdAt: Date.UTC(2026, 8, 8),
  ...over,
})
const inChat = (id: string, chatContextId: string, projectId?: string, title?: string) =>
  rule({
    id,
    scope: { kind: 'chat', chatContextId },
    chat: { chatContextId, ...(projectId ? { projectId } : {}), ...(title ? { title } : {}) },
  })

describe('actionRuleTitle', () => {
  it('names a whole-tool rule by its tool', () => {
    expect(actionRuleTitle(rule({}))).toBe('Always allow addFeature')
  })

  it('names an exact-call rule as that call', () => {
    expect(actionRuleTitle(rule({ covers: 'exact-call', toolName: 'readFile' }))).toBe(
      'Always allow this exact readFile call',
    )
  })

  it('names a rule with no tool by its kind', () => {
    expect(
      actionRuleTitle(rule({ toolName: undefined, covers: 'exact-call', kind: 'network-unlock' })),
    ).toBe('Always allow this Network unlock request')
  })
})

describe('actionRuleCallSummary', () => {
  it('reads each argument as name: value', () => {
    expect(actionRuleCallSummary({ path: 'src/a.ts', limit: 20, all: true })).toBe(
      'path: src/a.ts · limit: 20 · all: true',
    )
  })

  it('cuts a long value', () => {
    const summary = actionRuleCallSummary({ query: 'x'.repeat(60) })
    expect(summary).toBe(`query: ${'x'.repeat(39)}…`)
  })

  it('counts a list and folds an object', () => {
    expect(actionRuleCallSummary({ ids: ['a', 'b', 'c'], patch: { title: 'T' } })).toBe(
      'ids: [3 items] · patch: {title}',
    )
  })

  it('says a call took no arguments', () => {
    expect(actionRuleCallSummary({})).toBe('no arguments')
  })

  it('reads a bare value as itself', () => {
    expect(actionRuleCallSummary('https://example.com')).toBe('https://example.com')
  })

  it('cuts a summary that runs long', () => {
    const args = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`key${i}`, 'value']))
    const summary = actionRuleCallSummary(args)!
    expect(summary.length).toBe(140)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('reads nothing for a rule with no arguments known', () => {
    expect(actionRuleCallSummary(undefined)).toBeUndefined()
  })

  it('reads a null value as null', () => {
    expect(actionRuleCallSummary({ parent: null })).toBe('parent: null')
  })
})

describe('actionRuleRowView', () => {
  const now = Date.UTC(2026, 9, 7, 12)

  it('says an everywhere rule applies in every chat, whichever model or sign-in', () => {
    expect(actionRuleRowView(rule({}), { now }).where).toBe(
      'Everywhere — every chat, with any model or sign-in',
    )
  })

  it('says a chat rule shown in its own chat applies in this chat', () => {
    expect(actionRuleRowView(inChat('a', '/projects/p1'), { now, inChat: true }).where).toBe(
      'In this chat',
    )
  })

  it('names the chat a chat rule applies in elsewhere', () => {
    expect(actionRuleRowView(inChat('a', '/projects/p1', 'p1', 'Planning'), { now }).where).toBe(
      'In “Planning”',
    )
  })

  it('names a chat with no title by its kind', () => {
    expect(
      actionRuleRowView(inChat('a', '/projects/p1', 'p1'), { now, projectTitle: () => 'Shop' })
        .where,
    ).toBe('In “Shop Chat”')
  })

  it('summarises an exact call and leaves a whole-tool rule without one', () => {
    expect(
      actionRuleRowView(rule({ covers: 'exact-call', args: { path: 'a' } }), { now }).callSummary,
    ).toBe('path: a')
    expect(actionRuleRowView(rule({}), { now }).callSummary).toBeUndefined()
  })

  it('names the sign-in it was given on — a record, not a limit', () => {
    expect(
      actionRuleRowView(rule({ credentialId: 'c', credentialLabel: 'Work' }), { now }).signIn,
    ).toBe('Given on Work')
  })

  it('says when a rule’s sign-in was removed', () => {
    expect(actionRuleRowView(rule({ credentialId: 'c' }), { now }).signIn).toBe(
      'Given on a sign-in that was removed',
    )
  })

  it('names no sign-in for a rule under none', () => {
    expect(actionRuleRowView(rule({}), { now }).signIn).toBeUndefined()
  })

  it('says when it was made', () => {
    expect(actionRuleRowView(rule({}), { now }).made).toBe(
      `Made ${formatDateShort(new Date(Date.UTC(2026, 8, 8)))}`,
    )
  })

  it('says a rule was not used yet', () => {
    expect(actionRuleRowView(rule({}), { now }).lastUsed).toBe('Not used yet')
  })

  it('says how long ago a rule was used today', () => {
    expect(actionRuleRowView(rule({ lastUsedAt: now - 2 * 3600_000 }), { now }).lastUsed).toBe(
      'Last used 2 hours ago',
    )
  })

  it('dates an older use', () => {
    const at = Date.UTC(2026, 9, 1)
    expect(actionRuleRowView(rule({ lastUsedAt: at }), { now }).lastUsed).toBe(
      `Last used ${formatDateShort(new Date(at))}`,
    )
  })
})

describe('chatActionRules', () => {
  it('keeps only the rules scoped to that chat', () => {
    const rules = [inChat('a', 'c1'), inChat('b', 'c2'), rule({ id: 'e' })]
    expect(chatActionRules(rules, 'c1').map((r) => r.id)).toEqual(['a'])
  })
})

describe('groupActionRules', () => {
  const projectTitle = (id: string) => ({ p1: 'Shop', p2: 'Admin' })[id]
  const rules = [
    inChat('a', '/projects/p1/topics/t1', 'p1', 'Pricing'),
    rule({ id: 'e1', credentialId: 'cred-1' }),
    inChat('b', '/projects/p2', 'p2', 'Admin chat'),
    inChat('c', '/projects/p1/topics/t0', 'p1', 'Checkout'),
    inChat('d', '/groups/g1', undefined, 'Group chat'),
    inChat('f', '/projects/p1/topics/t1', 'p1', 'Pricing'),
  ]

  it('lists everywhere rules first, on their own', () => {
    expect(groupActionRules(rules, { projectTitle }).everywhere.map((r) => r.id)).toEqual(['e1'])
  })

  it('groups chat rules by project, projects by title, other chats last', () => {
    expect(groupActionRules(rules, { projectTitle }).projects.map((p) => p.title)).toEqual([
      'Admin',
      'Shop',
      'Other chats',
    ])
  })

  it('groups a project’s rules by chat, chats by title', () => {
    const shop = groupActionRules(rules, { projectTitle }).projects.find((p) => p.title === 'Shop')
    expect(shop?.chats.map((c) => [c.title, c.rules.map((r) => r.id)])).toEqual([
      ['Checkout', ['c']],
      ['Pricing', ['a', 'f']],
    ])
  })

  it('narrows to one project, leaving out everywhere rules', () => {
    const grouped = groupActionRules(rules, { projectTitle, projectId: 'p2' })
    expect(grouped.everywhere).toEqual([])
    expect(grouped.projects.map((p) => p.projectId)).toEqual(['p2'])
  })

  it('narrows to one sign-in', () => {
    const grouped = groupActionRules(rules, { projectTitle, credentialId: 'cred-1' })
    expect(grouped.everywhere.map((r) => r.id)).toEqual(['e1'])
    expect(grouped.projects).toEqual([])
  })

  it('titles a project it cannot name by its id', () => {
    const grouped = groupActionRules([inChat('z', '/projects/p9', 'p9', 'X')], {
      projectTitle,
    })
    expect(grouped.projects[0]?.title).toBe('p9')
  })

  it('is empty with no rules', () => {
    expect(groupActionRules([], { projectTitle })).toEqual({ everywhere: [], projects: [] })
  })
})

describe('actionRuleFilterOptions', () => {
  it('offers the projects and sign-ins the rules have, each once, by name', () => {
    const rules = [
      inChat('a', '/projects/p1', 'p1', 'A'),
      inChat('b', '/projects/p1', 'p1', 'A'),
      rule({ id: 'e', credentialId: 'cred-1', credentialLabel: 'Work' }),
      rule({ id: 'f', credentialId: 'cred-2' }),
    ]
    expect(actionRuleFilterOptions(rules, { projectTitle: () => 'Shop' })).toEqual({
      projects: [{ value: 'p1', label: 'Shop' }],
      signIns: [
        { value: 'cred-2', label: 'a sign-in that was removed' },
        { value: 'cred-1', label: 'Work' },
      ],
    })
  })
})

describe('removeActionRuleConfirm', () => {
  it('names the rule and what removing it does', () => {
    expect(removeActionRuleConfirm(rule({}))).toBe(
      'Remove “Always allow addFeature”? Its calls will ask you again.',
    )
  })
})
