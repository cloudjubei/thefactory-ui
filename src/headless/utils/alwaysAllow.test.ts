import { describe, expect, it } from 'vitest'
import {
  alwaysAllowChoiceView,
  alwaysAllowDecision,
  alwaysAllowScopeOf,
  cliAlwaysAllowScopes,
  decisionGrantScope,
  grantCoversOf,
  grantRuleText,
} from './alwaysAllow'
import {
  ALWAYS_ALLOW_EVERYWHERE_LABEL,
  ALWAYS_ALLOW_IN_CHAT_LABEL,
  ALWAYS_ALLOWED_EVERYWHERE_LABEL,
  ALWAYS_ALLOWED_IN_CHAT_LABEL,
} from './alwaysAllowConstants'

describe('cliAlwaysAllowScopes', () => {
  it('offers this chat first, then everywhere, for an ask raised in a chat', () => {
    expect(cliAlwaysAllowScopes({ chatContextId: 'c1' })).toEqual(['chat', 'everywhere'])
  })

  it('offers only everywhere for an ask raised outside any chat', () => {
    expect(cliAlwaysAllowScopes({})).toEqual(['everywhere'])
  })

  it('offers nothing for an ask that refuses standing grants', () => {
    expect(cliAlwaysAllowScopes({ chatContextId: 'c1', noPermanentGrant: true })).toEqual([])
  })
})

describe('grantCoversOf', () => {
  it('reads a grant given by tool name as the whole tool', () => {
    expect(grantCoversOf({ tool: 'addFeature' })).toBe('tool')
  })

  it('reads a grant over the call’s arguments as that exact call', () => {
    expect(grantCoversOf({ tool: 'addFeature', args: { title: 'A' } })).toBe('exact-call')
  })

  it('reads an ask that names no grant as that exact call', () => {
    expect(grantCoversOf(undefined)).toBe('exact-call')
  })
})

describe('alwaysAllowDecision / alwaysAllowScopeOf', () => {
  it('turns this chat into the in-chat decision', () => {
    expect(alwaysAllowDecision('chat')).toBe('always-in-chat')
  })

  it('turns everywhere into the everywhere decision', () => {
    expect(alwaysAllowDecision('everywhere')).toBe('always-everywhere')
  })

  it('reads the scope back from an in-chat decision', () => {
    expect(alwaysAllowScopeOf('always-in-chat')).toBe('chat')
  })

  it('reads the scope back from an everywhere decision', () => {
    expect(alwaysAllowScopeOf('always-everywhere')).toBe('everywhere')
  })

  it('reads no scope from a one-off approval', () => {
    expect(alwaysAllowScopeOf('once')).toBeUndefined()
  })
})

describe('decisionGrantScope', () => {
  it('scopes an in-chat decision to the ask’s own chat', () => {
    expect(decisionGrantScope('always-in-chat', 'c1')).toEqual({
      kind: 'chat',
      chatContextId: 'c1',
    })
  })

  it('scopes an everywhere decision everywhere', () => {
    expect(decisionGrantScope('always-everywhere', 'c1')).toEqual({ kind: 'everywhere' })
  })

  it('carries no scope on a one-off approval', () => {
    expect(decisionGrantScope('once', 'c1')).toBeUndefined()
  })

  it('carries no scope on a refusal', () => {
    expect(decisionGrantScope('deny', 'c1')).toBeUndefined()
  })

  it('refuses an in-chat decision for an ask raised outside any chat', () => {
    expect(() => decisionGrantScope('always-in-chat', undefined)).toThrow(/chat/)
  })
})

describe('grantRuleText', () => {
  it('names the whole tool in this chat', () => {
    expect(
      grantRuleText('addFeature', { tool: 'addFeature' }, { kind: 'chat', chatContextId: 'c' }),
    ).toBe('always allow addFeature in this chat')
  })

  it('names the whole tool everywhere', () => {
    expect(grantRuleText('addFeature', { tool: 'addFeature' }, { kind: 'everywhere' })).toBe(
      'always allow addFeature everywhere',
    )
  })

  it('names one exact call in this chat', () => {
    expect(
      grantRuleText(
        'readFile',
        { tool: 'readFile', args: {} },
        { kind: 'chat', chatContextId: 'c' },
      ),
    ).toBe('always allow this exact readFile call in this chat')
  })

  it('reads a rule recorded before scopes existed as everywhere', () => {
    expect(grantRuleText('addFeature', { tool: 'addFeature' }, undefined)).toBe(
      'always allow addFeature everywhere',
    )
  })

  it('names an unnamed request', () => {
    expect(grantRuleText(undefined, undefined, { kind: 'everywhere' })).toBe(
      'always allow this request everywhere',
    )
  })
})

describe('alwaysAllowChoiceView — choosing', () => {
  const both = {
    scopes: ['chat', 'everywhere'] as const,
    toolName: 'addFeature',
    covers: 'tool' as const,
  }

  it('makes this chat the default a single click gives', () => {
    const view = alwaysAllowChoiceView(both)
    expect(view.primary).toEqual({ scope: 'chat', label: ALWAYS_ALLOW_IN_CHAT_LABEL })
  })

  it('offers this chat and everywhere in the menu, explaining everywhere', () => {
    const view = alwaysAllowChoiceView(both)
    expect(view.options).toEqual([
      expect.objectContaining({
        scope: 'chat',
        label: ALWAYS_ALLOW_IN_CHAT_LABEL,
        selected: false,
      }),
      expect.objectContaining({
        scope: 'everywhere',
        label: ALWAYS_ALLOW_EVERYWHERE_LABEL,
        description: 'Every chat, with any model or sign-in',
        selected: false,
      }),
    ])
  })

  it('describes this chat by what the grant covers', () => {
    expect(alwaysAllowChoiceView(both).options[0]?.description).toBe(
      'Every later addFeature call in this chat',
    )
  })

  it('describes an exact-call grant as that call', () => {
    const view = alwaysAllowChoiceView({ ...both, covers: 'exact-call' })
    expect(view.options.map((o) => o.description)).toEqual([
      'This exact addFeature call, whenever it repeats in this chat',
      'This exact call, in every chat, with any model or sign-in',
    ])
  })

  it('says in its tooltip what the default allows', () => {
    expect(alwaysAllowChoiceView(both).title).toBe(
      'Allow addFeature now and every later call of it in this chat',
    )
  })

  it('says in its tooltip what an exact-call default allows', () => {
    expect(alwaysAllowChoiceView({ ...both, covers: 'exact-call' }).title).toBe(
      'Allow this exact addFeature call now and whenever it repeats in this chat',
    )
  })

  it('offers no menu when only one place is possible', () => {
    const view = alwaysAllowChoiceView({ ...both, scopes: ['chat'] })
    expect(view.options).toEqual([])
    expect(view.primary.scope).toBe('chat')
  })

  it('defaults to everywhere when the ask has no chat', () => {
    const view = alwaysAllowChoiceView({ ...both, scopes: ['everywhere'] })
    expect(view.primary).toEqual({ scope: 'everywhere', label: ALWAYS_ALLOW_EVERYWHERE_LABEL })
    expect(view.title).toBe(
      'Allow addFeature now and every later call of it in every chat, with any model or sign-in',
    )
  })
})

describe('alwaysAllowChoiceView — marked', () => {
  const both = {
    scopes: ['chat', 'everywhere'] as const,
    toolName: 'addFeature',
    covers: 'tool' as const,
  }

  it('shows a row marked for this chat, and a click unmarks it', () => {
    const view = alwaysAllowChoiceView({ ...both, marked: 'chat' })
    expect(view.primary).toEqual({ scope: undefined, label: ALWAYS_ALLOWED_IN_CHAT_LABEL })
    expect(view.marked).toBe(true)
  })

  it('shows a row marked for everywhere', () => {
    expect(alwaysAllowChoiceView({ ...both, marked: 'everywhere' }).primary.label).toBe(
      ALWAYS_ALLOWED_EVERYWHERE_LABEL,
    )
  })

  it('ticks the marked place in the menu', () => {
    const view = alwaysAllowChoiceView({ ...both, marked: 'everywhere' })
    expect(view.options.map((o) => o.selected)).toEqual([false, true])
  })

  it('says in its tooltip that Resume will apply it, and how to undo', () => {
    expect(alwaysAllowChoiceView({ ...both, marked: 'everywhere' }).title).toBe(
      'Resume will allow addFeature from now on in every chat, with any model or sign-in — click to undo',
    )
  })

  it('reads as unmarked when it names nothing', () => {
    expect(alwaysAllowChoiceView(both).marked).toBe(false)
  })
})
