import { describe, expect, it } from 'vitest'
import { isShowStoredSecretTool, storedSecretView } from './storedSecretView'

describe('isShowStoredSecretTool', () => {
  it('knows the tool on every transport, by its plain or its MCP name', () => {
    expect(isShowStoredSecretTool('showStoredSecret')).toBe(true)
    expect(isShowStoredSecretTool('mcp__thefactory__showStoredSecret')).toBe(true)
    expect(isShowStoredSecretTool('listLlmConfigs')).toBe(false)
    expect(isShowStoredSecretTool(undefined)).toBe(false)
  })
})

describe('storedSecretView', () => {
  const shown = {
    ok: true,
    shownToUser: true,
    kind: 'git-token',
    id: 'g1',
    name: 'GitHub',
    instruction: 'x',
  }

  it('is the secret to reveal once the call ran, named as the host named it', () => {
    expect(
      storedSecretView({
        args: { credentialId: 'g1', purpose: 'check the token' },
        result: shown,
        resultType: 'success',
      }),
    ).toEqual({
      kind: 'git-token',
      id: 'g1',
      name: 'GitHub',
      label: 'Git token',
      purpose: 'check the token',
    })
  })

  it('reads a CLI row’s result, which arrives as JSON text', () => {
    const view = storedSecretView({
      args: { provider: 'tavily' },
      result: JSON.stringify({ ...shown, kind: 'web-search-key', id: 'tavily', name: 'tavily' }),
      resultType: 'success',
    })
    expect(view).toMatchObject({ kind: 'web-search-key', id: 'tavily', label: 'Web-search key' })
  })

  it('reads a CLI row whose corrected call carries a note after its result', () => {
    const view = storedSecretView({
      args: { configId: 'c1' },
      result: `${JSON.stringify({ ...shown, kind: 'llm-key', id: 'c1', name: 'Sol' })}\nNote: this call ran as showStoredSecret({ "configId": "c1" }).`,
      resultType: 'success',
    })
    expect(view).toMatchObject({ kind: 'llm-key', id: 'c1', name: 'Sol' })
  })

  it('is nothing to reveal before the call ran, or when the host refused it', () => {
    expect(storedSecretView({ args: { configId: 'c1' }, resultType: 'running' })).toBeUndefined()
    expect(
      storedSecretView({
        args: { configId: 'c1' },
        result: { error: "LLM config 'c1' not found." },
        resultType: 'success',
      }),
    ).toBeUndefined()
    expect(
      storedSecretView({ args: { configId: 'c1' }, result: shown, resultType: 'errored' }),
    ).toBeUndefined()
  })

  it('is nothing to reveal for a result that names a secret without saying it was shown', () => {
    const { shownToUser: _shown, ...named } = shown
    expect(
      storedSecretView({ args: { credentialId: 'g1' }, result: named, resultType: 'success' }),
    ).toBeUndefined()
  })

  it('is nothing to reveal for a result naming a kind it does not know', () => {
    expect(
      storedSecretView({
        args: {},
        result: { ...shown, kind: 'ssh-key' },
        resultType: 'success',
      }),
    ).toBeUndefined()
  })
})
