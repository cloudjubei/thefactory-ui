import { describe, expect, it } from 'vitest'
import { AUTH_CREDENTIAL_ID_HOST_PATH_PREFIX } from 'thefactory-tools/constants'

import {
  chatAgentLogin,
  cliLoginOf,
  expiredSignInNames,
  expiredSignInsByScope,
  processRunAgentLogin,
  scopeSignInNames,
  settingsNavIndicator,
  signInCardsByChat,
  signInExpiredTitle,
  signInName,
  signInsExpiredTitle,
  storedSignInsExpired,
} from './signInExpiry'
import type { CredentialCapture } from './credentialCaptureTypes'
import type { ActiveCliLogin, CliLogin, SignInLogins } from './signInExpiryTypes'

const expired = (id: string, cli = 'claude-code'): CliLogin => ({
  id,
  cli,
  authStatus: { authenticated: false },
})
const signedIn = (id: string, cli = 'claude-code'): CliLogin => ({
  id,
  cli,
  authStatus: { authenticated: true },
})
const unchecked = (id: string, cli = 'claude-code'): CliLogin => ({ id, cli })

const NO_ACTIVE: ActiveCliLogin = { activeCli: null, activeCliCredentialId: null }

function signIns(logins: CliLogin[], active: ActiveCliLogin = NO_ACTIVE): SignInLogins {
  return { logins, active }
}

describe('signInName', () => {
  it('names a login by the account it signs in to', () => {
    expect(signInName('claude-code')).toBe('Claude')
    expect(signInName('codex')).toBe('Codex')
    expect(signInName('cursor-agent')).toBe('Cursor')
  })

  it('falls back to the CLI’s own label', () => {
    expect(signInName('gemini')).toBe('gemini')
  })
})

describe('signInExpiredTitle', () => {
  it('says the sign-in expired', () => {
    expect(signInExpiredTitle('Claude')).toBe('Claude sign-in expired')
  })
})

describe('chatAgentLogin', () => {
  it('is the chat’s CLI and the login it is bound to', () => {
    expect(chatAgentLogin({ tool: 'claude-code', credentialId: 'c1' })).toEqual({
      cli: 'claude-code',
      credentialId: 'c1',
    })
    expect(chatAgentLogin({ tool: 'codex' })).toEqual({ cli: 'codex' })
  })

  it('is nothing for a chat on the API or on an API key', () => {
    expect(chatAgentLogin(undefined)).toBeUndefined()
    expect(chatAgentLogin(null)).toBeUndefined()
    expect(chatAgentLogin({ tool: 'claude-code', apiKeyCredentialId: 'k1' })).toBeUndefined()
    expect(chatAgentLogin({ tool: '  ' })).toBeUndefined()
  })
})

describe('processRunAgentLogin', () => {
  it('reads the CLI login the launch asked for', () => {
    expect(
      processRunAgentLogin({
        input: { runner: 'cli', cliRunner: { cli: 'claude-code', authCredentialId: 'c1' } },
      }),
    ).toEqual({ cli: 'claude-code', credentialId: 'c1' })
    expect(processRunAgentLogin({ input: { runner: 'cli', cliRunner: { cli: 'codex' } } })).toEqual(
      { cli: 'codex' },
    )
  })

  it('prefers the model a person chose for the run since', () => {
    expect(
      processRunAgentLogin({
        input: { runner: 'cli', cliRunner: { cli: 'claude-code', authCredentialId: 'c1' } },
        modelOverride: { runner: 'cli', cli: 'codex', authCredentialId: 'x1', at: 1 },
      }),
    ).toEqual({ cli: 'codex', credentialId: 'x1' })
    expect(
      processRunAgentLogin({
        input: { runner: 'cli', cliRunner: { cli: 'claude-code' } },
        modelOverride: { runner: 'api', at: 1 },
      }),
    ).toBeUndefined()
  })

  it('is nothing for a run on the API, on an API key, or with no launch input', () => {
    expect(processRunAgentLogin({})).toBeUndefined()
    expect(processRunAgentLogin({ input: { runner: 'api' } })).toBeUndefined()
    expect(
      processRunAgentLogin({ input: { runner: 'api', cliRunner: { cli: 'claude-code' } } }),
    ).toBeUndefined()
    expect(
      processRunAgentLogin({
        input: { runner: 'cli', cliRunner: { cli: 'claude-code', apiKeyCredentialId: 'k1' } },
      }),
    ).toBeUndefined()
    expect(
      processRunAgentLogin({
        input: { runner: 'cli' },
        modelOverride: { runner: 'cli', cli: 'codex', apiKeyCredentialId: 'k1', at: 1 },
      }),
    ).toBeUndefined()
    expect(processRunAgentLogin({ input: { runner: 'cli', cliRunner: 'x' } })).toBeUndefined()
  })
})

describe('cliLoginOf', () => {
  it('is the login the work is bound to, while it is that CLI’s', () => {
    const logins = [signedIn('a'), expired('b')]
    expect(cliLoginOf({ cli: 'claude-code', credentialId: 'b' }, signIns(logins))?.id).toBe('b')
  })

  it('takes the active login, then the CLI’s first, for work bound to none or to a gone one', () => {
    const logins = [signedIn('a'), expired('b'), signedIn('c', 'codex')]
    const active = { activeCli: 'claude-code', activeCliCredentialId: 'b' }
    expect(cliLoginOf({ cli: 'claude-code' }, signIns(logins, active))?.id).toBe('b')
    expect(
      cliLoginOf({ cli: 'claude-code', credentialId: 'gone' }, signIns(logins, active))?.id,
    ).toBe('b')
    expect(cliLoginOf({ cli: 'claude-code', credentialId: 'c' }, signIns(logins, active))?.id).toBe(
      'b',
    )
    expect(cliLoginOf({ cli: 'claude-code' }, signIns(logins))?.id).toBe('a')
    expect(
      cliLoginOf(
        { cli: 'codex' },
        signIns(logins, { activeCli: 'claude-code', activeCliCredentialId: 'b' }),
      )?.id,
    ).toBe('c')
  })

  it('knows nothing of a login read off the host, or a CLI with none stored', () => {
    const logins = [expired('a')]
    expect(
      cliLoginOf(
        { cli: 'claude-code', credentialId: `${AUTH_CREDENTIAL_ID_HOST_PATH_PREFIX}/home` },
        signIns(logins),
      ),
    ).toBeUndefined()
    expect(cliLoginOf({ cli: 'codex' }, signIns(logins))).toBeUndefined()
  })
})

describe('expiredSignInNames', () => {
  it('names each expired login the work uses, once', () => {
    const logins = [expired('a'), expired('x', 'codex'), signedIn('s', 'cursor-agent')]
    expect(
      expiredSignInNames(
        [
          { cli: 'claude-code', credentialId: 'a' },
          { cli: 'claude-code' },
          undefined,
          { cli: 'codex' },
          { cli: 'cursor-agent' },
        ],
        signIns(logins),
      ),
    ).toEqual(['Claude', 'Codex'])
  })

  it('never cries wolf on a login that was not checked yet', () => {
    expect(expiredSignInNames([{ cli: 'claude-code' }], signIns([unchecked('a')]))).toEqual([])
  })
})

describe('expiredSignInsByScope', () => {
  const logins = signIns([expired('a'), signedIn('b'), expired('x', 'codex')])
  const run = (over: Record<string, unknown>) => ({
    projectId: 'p1',
    status: 'running' as const,
    input: { runner: 'cli', cliRunner: { cli: 'claude-code', authCredentialId: 'a' } },
    ...over,
  })

  it('puts a project’s live chats and current runs on an expired login under it', () => {
    const out = expiredSignInsByScope({
      chats: [
        {
          projectId: 'p1',
          cliRunner: { tool: 'claude-code', credentialId: 'a' },
          isThinking: true,
        },
        { projectId: 'p2', cliRunner: { tool: 'codex' }, isThinking: false, pendingAsks: 1 },
      ],
      runs: [run({}), run({ projectId: 'p3', status: 'parked' })],
      signIns: logins,
    })
    expect(out.byProject.get('p1')).toEqual({ chats: ['Claude'], runs: ['Claude'] })
    expect(out.byProject.get('p2')).toEqual({ chats: ['Codex'], runs: [] })
    expect(out.byProject.get('p3')).toEqual({ chats: [], runs: ['Claude'] })
  })

  it('puts a process run’s chat on its project’s runs, never its chats', () => {
    const out = expiredSignInsByScope({
      chats: [
        {
          projectId: 'p1',
          cliRunner: { tool: 'claude-code', credentialId: 'a' },
          isThinking: true,
          channel: 'processes',
        },
        {
          projectId: 'p2',
          isThinking: false,
          channel: 'processes',
          signInCards: [{ cli: 'codex', credentialId: 'x' }],
        },
      ],
      runs: [],
      signIns: logins,
    })
    expect(out.byProject.get('p1')).toEqual({ chats: [], runs: ['Claude'] })
    expect(out.byProject.get('p2')).toEqual({ chats: [], runs: ['Codex'] })
  })

  it('leaves out idle chats, chats on a signed-in login, and work that is not live', () => {
    const out = expiredSignInsByScope({
      chats: [
        {
          projectId: 'p1',
          cliRunner: { tool: 'claude-code', credentialId: 'a' },
          isThinking: false,
        },
        {
          projectId: 'p1',
          cliRunner: { tool: 'claude-code', credentialId: 'b' },
          isThinking: true,
          pendingAsks: 2,
        },
      ],
      runs: [
        run({ status: 'succeeded' }),
        run({ status: 'failed' }),
        run({ parentRunId: 'root' }),
        run({ input: { runner: 'api' } }),
      ],
      signIns: logins,
    })
    expect(out.byProject.size).toBe(0)
    expect(out.byGroup.size).toBe(0)
  })

  it('puts a group’s own live chats under the group', () => {
    const out = expiredSignInsByScope({
      chats: [
        { groupId: 'g1', cliRunner: { tool: 'claude-code' }, isThinking: false, pendingAsks: 1 },
      ],
      runs: [],
      signIns: logins,
    })
    expect(out.byGroup.get('g1')).toEqual(['Claude'])
    expect(out.byProject.size).toBe(0)
  })
})

describe('expiredSignInsByScope — a chat waiting on a sign-in card', () => {
  const logins = signIns([expired('a'), signedIn('b')])

  it('counts a chat whose sign-in card waits, though no agent replies and no ask waits', () => {
    const out = expiredSignInsByScope({
      chats: [
        {
          projectId: 'p1',
          cliRunner: { tool: 'claude-code', credentialId: 'a' },
          isThinking: false,
          signInCards: [{ cli: 'claude-code', credentialId: 'a' }],
        },
      ],
      runs: [],
      signIns: logins,
    })
    expect(out.byProject.get('p1')).toEqual({ chats: ['Claude'], runs: [] })
  })

  it('counts the login once, however many chats wait on its card or work on it', () => {
    const out = expiredSignInsByScope({
      chats: [
        {
          projectId: 'p1',
          cliRunner: { tool: 'claude-code', credentialId: 'a' },
          isThinking: true,
          signInCards: [{ cli: 'claude-code', credentialId: 'a' }],
        },
        {
          projectId: 'p1',
          isThinking: false,
          signInCards: [{ cli: 'claude-code', credentialId: 'a' }],
        },
      ],
      runs: [],
      signIns: logins,
    })
    expect(out.byProject.get('p1')).toEqual({ chats: ['Claude'], runs: [] })
  })

  it('leaves out a card for a login still signed in', () => {
    const out = expiredSignInsByScope({
      chats: [
        {
          groupId: 'g1',
          isThinking: false,
          signInCards: [{ cli: 'claude-code', credentialId: 'b' }],
        },
      ],
      runs: [],
      signIns: logins,
    })
    expect(out.byGroup.size).toBe(0)
  })
})

describe('signInCardsByChat', () => {
  const capture = (over: Partial<CredentialCapture>): CredentialCapture => ({
    id: 'c',
    purpose: 'Sign in again',
    provider: 'cli-login',
    preset: 'claude-code',
    replacesId: 'a',
    chatContextKey: 'chat-1',
    status: 'requested',
    requestedAt: '2026-10-13T00:00:00.000Z',
    ...over,
  })

  it('is the stored login each chat’s open sign-in card signs in again', () => {
    const out = signInCardsByChat([
      capture({}),
      capture({ id: 'd', preset: 'codex', replacesId: 'x' }),
      capture({ id: 'e', chatContextKey: 'chat-2' }),
    ])
    expect(out.get('chat-1')).toEqual([
      { cli: 'claude-code', credentialId: 'a' },
      { cli: 'codex', credentialId: 'x' },
    ])
    expect(out.get('chat-2')).toEqual([{ cli: 'claude-code', credentialId: 'a' }])
  })

  it('leaves out answered cards, other forms, a card for a new login, and one outside a chat', () => {
    const out = signInCardsByChat([
      capture({ status: 'submitted' }),
      capture({ status: 'cancelled' }),
      capture({ provider: 'git' }),
      capture({ replacesId: undefined }),
      capture({ preset: undefined }),
      capture({ chatContextKey: undefined }),
    ])
    expect(out.size).toBe(0)
  })
})

describe('storedSignInsExpired', () => {
  it('names every stored login checked and found signed out, once each', () => {
    expect(
      storedSignInsExpired([
        expired('a'),
        expired('a2'),
        signedIn('b', 'codex'),
        unchecked('c', 'cursor-agent'),
        expired('x', 'codex'),
      ]),
    ).toEqual(['Claude', 'Codex'])
  })

  it('never counts a login read off the host', () => {
    expect(storedSignInsExpired([expired(`${AUTH_CREDENTIAL_ID_HOST_PATH_PREFIX}/home`)])).toEqual(
      [],
    )
  })
})

describe('signInsExpiredTitle', () => {
  it('names one, two, or more expired sign-ins', () => {
    expect(signInsExpiredTitle(['Claude'])).toBe('Claude sign-in expired')
    expect(signInsExpiredTitle(['Claude', 'Codex'])).toBe('Claude and Codex sign-ins expired')
    expect(signInsExpiredTitle(['Claude', 'Codex', 'Cursor'])).toBe(
      'Claude, Codex and Cursor sign-ins expired',
    )
  })
})

describe('settingsNavIndicator', () => {
  it('is nothing while every login is signed in', () => {
    expect(settingsNavIndicator([])).toEqual({ kind: 'none' })
  })

  it('is red for each expired sign-in, named in its title', () => {
    expect(settingsNavIndicator(['Claude', 'Codex'])).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 2 }], rollup: false },
      title: 'Claude and Codex sign-ins expired',
    })
  })
})

describe('scopeSignInNames', () => {
  it('is every expired login a project’s chats and runs use, once', () => {
    expect(scopeSignInNames({ chats: ['Claude'], runs: ['Claude', 'Codex'] })).toEqual([
      'Claude',
      'Codex',
    ])
    expect(scopeSignInNames(undefined)).toEqual([])
  })

  it('leaves out a channel whose badge is turned off', () => {
    const scope = { chats: ['Codex'], runs: ['Claude'] }
    expect(scopeSignInNames(scope, { chat: false })).toEqual(['Claude'])
    expect(scopeSignInNames(scope, { processes: false })).toEqual(['Codex'])
    expect(scopeSignInNames(scope, { chat: true, processes: true })).toEqual(['Codex', 'Claude'])
  })
})
