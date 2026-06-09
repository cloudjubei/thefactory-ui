import { describe, it, expect } from 'vitest'
import {
  chatCliRunnerToDispatchOptions,
  chatCliRunnerToStartRunBody,
  enabledClis,
  groupCachesByCli,
  loginAwaitsCode,
  parseCliAuthLoginEvent,
  parseLoginUrl,
} from './cliRunner'

describe('chatCliRunnerToDispatchOptions', () => {
  it('maps tool→cli and credentialId→authCredentialId', () => {
    expect(chatCliRunnerToDispatchOptions({ tool: 'claude-code', credentialId: 'cli-1' })).toEqual({
      cli: 'claude-code',
      authCredentialId: 'cli-1',
    })
  })

  it('carries apiKeyCredentialId and omits absent credential', () => {
    expect(chatCliRunnerToDispatchOptions({ tool: 'codex', apiKeyCredentialId: 'llm-1' })).toEqual({
      cli: 'codex',
      apiKeyCredentialId: 'llm-1',
    })
  })
})

describe('chatCliRunnerToStartRunBody', () => {
  it('maps tool→cli and credentialId→authCredentialId with prompt + project', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'claude-code', credentialId: 'cli-1' },
      { projectId: 'p1', prompt: 'hi', chatContextId: 'c1' },
    )
    expect(body).toEqual({
      projectId: 'p1',
      cli: 'claude-code',
      prompt: 'hi',
      chatContextId: 'c1',
      authCredentialId: 'cli-1',
    })
  })

  it('carries apiKeyCredentialId through and omits absent optionals', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'codex', apiKeyCredentialId: 'llm-1' },
      { projectId: 'p1', prompt: 'go' },
    )
    expect(body).toEqual({
      projectId: 'p1',
      cli: 'codex',
      prompt: 'go',
      apiKeyCredentialId: 'llm-1',
    })
    expect('chatContextId' in body).toBe(false)
    expect('authCredentialId' in body).toBe(false)
  })

  it('threads storyId when present', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'cursor-agent', credentialId: 'c' },
      { projectId: 'p1', prompt: 'x', storyId: 's1' },
    )
    expect(body.storyId).toBe('s1')
  })
})

describe('enabledClis', () => {
  it('returns the keys whose value is true', () => {
    expect(
      enabledClis({ enabled: { 'claude-code': true, codex: false, 'cursor-agent': true } }),
    ).toEqual(['claude-code', 'cursor-agent'])
  })

  it('returns [] for undefined / empty state', () => {
    expect(enabledClis(undefined)).toEqual([])
    expect(enabledClis(null)).toEqual([])
    expect(enabledClis({})).toEqual([])
    expect(enabledClis({ enabled: {} })).toEqual([])
  })
})

describe('groupCachesByCli', () => {
  it('buckets caches by their cli tag preserving order', () => {
    const caches = [
      { id: 'a', cli: 'claude-code' },
      { id: 'b', cli: 'codex' },
      { id: 'c', cli: 'claude-code' },
    ]
    expect(groupCachesByCli(caches)).toEqual({
      'claude-code': [
        { id: 'a', cli: 'claude-code' },
        { id: 'c', cli: 'claude-code' },
      ],
      codex: [{ id: 'b', cli: 'codex' }],
    })
  })

  it('returns {} for no caches', () => {
    expect(groupCachesByCli([])).toEqual({})
  })
})

describe('parseCliAuthLoginEvent', () => {
  it('extracts the chunk text from a chunk event (not the raw JSON envelope)', () => {
    expect(
      parseCliAuthLoginEvent({
        loginId: 'login_1',
        type: 'chunk',
        event: { loginId: 'login_1', chunk: 'Starting login process...\n' },
      }),
    ).toEqual({ loginId: 'login_1', kind: 'chunk', text: 'Starting login process...\n' })
  })

  it('extracts the credentialId from a completed event', () => {
    expect(
      parseCliAuthLoginEvent({
        loginId: 'login_1',
        type: 'completed',
        event: { loginId: 'login_1', credentialId: 'cred-9' },
      }),
    ).toEqual({ loginId: 'login_1', kind: 'completed', credentialId: 'cred-9' })
  })

  it('extracts the error message from an error event', () => {
    expect(
      parseCliAuthLoginEvent({
        loginId: 'login_1',
        type: 'error',
        event: { loginId: 'login_1', error: "cursor-agent login exited with code 1" },
      }),
    ).toEqual({ loginId: 'login_1', kind: 'error', error: 'cursor-agent login exited with code 1' })
  })

  it('returns null for a payload without a loginId, an unknown type, or a non-object', () => {
    expect(parseCliAuthLoginEvent({ type: 'chunk', event: { chunk: 'x' } })).toBeNull()
    expect(parseCliAuthLoginEvent({ loginId: 'l', type: 'mystery', event: {} })).toBeNull()
    expect(parseCliAuthLoginEvent('nope')).toBeNull()
    expect(parseCliAuthLoginEvent(null)).toBeNull()
  })
})

describe('parseLoginUrl', () => {
  it('extracts the first sign-in URL from streamed output', () => {
    const out =
      'Opening browser to sign in…\nIf the browser didn\'t open, visit: https://claude.com/cai/oauth/authorize?code=true&x=1\n'
    expect(parseLoginUrl(out)).toBe('https://claude.com/cai/oauth/authorize?code=true&x=1')
  })

  it('strips trailing punctuation and returns null when no URL is present yet', () => {
    expect(parseLoginUrl('Open this link: https://cursor.com/loginDeepControl?c=abc).')).toBe(
      'https://cursor.com/loginDeepControl?c=abc',
    )
    expect(parseLoginUrl('Starting login…')).toBeNull()
  })
})

describe('loginAwaitsCode', () => {
  it('is true only when the output prompts for a pasted code', () => {
    expect(loginAwaitsCode('Paste code here if prompted >')).toBe(true)
    expect(loginAwaitsCode('Waiting for browser authentication...')).toBe(false)
    expect(loginAwaitsCode('Opening browser to sign in…')).toBe(false)
  })
})
