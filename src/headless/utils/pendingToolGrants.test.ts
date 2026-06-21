import { describe, it, expect } from 'vitest'
import {
  apiToolCallToGrant,
  cliDecideOutcome,
  cliPendingActionToGrant,
  formatActionLabel,
  isToolGrantAction,
} from './pendingToolGrants'

describe('apiToolCallToGrant', () => {
  it('maps an API tool-call to an api-source grant keyed by toolCallId', () => {
    expect(
      apiToolCallToGrant({ toolCallId: 'tc-1', name: 'writeFile', arguments: { path: 'a.ts' } }),
    ).toEqual({ id: 'tc-1', source: 'api', label: 'writeFile', detail: { path: 'a.ts' } })
  })
})

describe('cliPendingActionToGrant', () => {
  it('maps a CLI PendingAction to a cli-source grant with a humanised label', () => {
    expect(
      cliPendingActionToGrant({ id: 'a-1', kind: 'network-unlock', payload: { host: 'x' } }),
    ).toEqual({ id: 'a-1', source: 'cli', label: 'Network unlock', detail: { host: 'x' } })
  })
})

describe('isToolGrantAction', () => {
  it('treats gated tool / cap-raise / network-unlock as approvable grants', () => {
    expect(isToolGrantAction({ id: 'a', kind: 'network-unlock' })).toBe(true)
    expect(isToolGrantAction({ id: 'b', kind: 'workspace-limit-raise' })).toBe(true)
    expect(isToolGrantAction({ id: 'c', kind: 'tool' })).toBe(true)
  })

  it('treats auth-expired as a notification, not an approvable grant', () => {
    expect(isToolGrantAction({ id: 'd', kind: 'auth-expired' })).toBe(false)
  })
})

describe('formatActionLabel', () => {
  it('capitalises the first word and splits on - / _ / space', () => {
    expect(formatActionLabel('network-unlock')).toBe('Network unlock')
    expect(formatActionLabel('workspace-limit-raise')).toBe('Workspace limit raise')
    expect(formatActionLabel('install_package')).toBe('Install package')
  })

  it('returns the raw kind when it has no separable words', () => {
    expect(formatActionLabel('')).toBe('')
  })
})

describe('cliDecideOutcome', () => {
  it('routes once→approved, permanent→approved-permanent, deny→denied', () => {
    expect(cliDecideOutcome('once')).toBe('approved')
    expect(cliDecideOutcome('permanent')).toBe('approved-permanent')
    expect(cliDecideOutcome('deny')).toBe('denied')
  })
})
