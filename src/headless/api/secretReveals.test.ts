import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./generated', () => ({
  revealLlmConfigKey: vi.fn(),
  revealGitCredentialToken: vi.fn(),
  revealWebSearchKey: vi.fn(),
}))

import { revealGitCredentialToken, revealLlmConfigKey, revealWebSearchKey } from './generated'
import { revealStoredSecret } from './secretReveals'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('revealStoredSecret', () => {
  it('fetches each kind from its own route', async () => {
    asMock(revealLlmConfigKey).mockResolvedValue({ data: { value: 'k1' } })
    asMock(revealGitCredentialToken).mockResolvedValue({ data: { value: 't1' } })
    asMock(revealWebSearchKey).mockResolvedValue({ data: { value: 'w1' } })
    expect(await revealStoredSecret('llm-key', 'c1')).toEqual({ value: 'k1' })
    expect(await revealStoredSecret('git-token', 'g1')).toEqual({ value: 't1' })
    expect(await revealStoredSecret('web-search-key', 'tavily')).toEqual({ value: 'w1' })
    expect(revealLlmConfigKey).toHaveBeenCalledWith({ path: { id: 'c1' } })
    expect(revealGitCredentialToken).toHaveBeenCalledWith({ path: { id: 'g1' } })
    expect(revealWebSearchKey).toHaveBeenCalledWith({ path: { provider: 'tavily' } })
  })

  it('says a secret is no longer stored when its route finds none', async () => {
    asMock(revealLlmConfigKey).mockResolvedValue({
      error: { error: 'gone' },
      response: { status: 404 },
    })
    expect(await revealStoredSecret('llm-key', 'c1')).toEqual({ missing: true })
  })

  it('fails on any other answer, so the card offers another try', async () => {
    asMock(revealGitCredentialToken).mockResolvedValue({
      error: { error: 'boom' },
      response: { status: 500 },
    })
    await expect(revealStoredSecret('git-token', 'g1')).rejects.toThrow()
  })
})
