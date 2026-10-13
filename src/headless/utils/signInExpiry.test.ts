import { describe, expect, it } from 'vitest'
import { AUTH_CREDENTIAL_ID_HOST_PATH_PREFIX } from 'thefactory-tools/constants'

import {
  chatAgentLogin,
  cliLoginOf,
  expiredSignInNames,
  expiredSignInsByScope,
  processRunAgentLogin,
  scopeSignInNames,
  signInExpiredTitle,
  signInName,
} from './signInExpiry'
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
