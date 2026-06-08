import { describe, it, expect } from 'vitest'
import {
  chatCliRunnerToDispatchOptions,
  chatCliRunnerToStartRunBody,
  enabledClis,
  groupCachesByCli,
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
