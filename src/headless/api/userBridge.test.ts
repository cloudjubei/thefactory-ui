import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./generated', () => ({ listGitCredentials: vi.fn() }))

import { listGitCredentials } from './generated'
import { dispatchUserBridge } from './userBridge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchUserBridge', () => {
  it('answers user.current from the connected GitHub account', async () => {
    asMock(listGitCredentials).mockResolvedValue({
      data: [
        { id: '1', name: 'PAT', username: 'other', email: 'o@x', tokenSource: 'pat' },
        { id: '2', name: 'GitHub OAuth (kc)', username: 'kc', email: 'kc@x', tokenSource: 'oauth' },
      ],
    })
    expect(await dispatchUserBridge({ type: 'overseer:user.current', id: 'a' })).toEqual({
      name: 'kc',
      username: 'kc',
      email: 'kc@x',
    })
    expect(listGitCredentials).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('says no account is connected when no credential names anyone', async () => {
    asMock(listGitCredentials).mockResolvedValue({ data: [] })
    await expect(dispatchUserBridge({ type: 'overseer:user.current' })).rejects.toThrow(
      'No account connected',
    )
  })

  it("lifts the backend's message when the credentials can't be read", async () => {
    asMock(listGitCredentials).mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 500, data: { error: 'Credential store locked' } },
      }),
    )
    await expect(dispatchUserBridge({ type: 'overseer:user.current' })).rejects.toThrow(
      'Credential store locked',
    )
  })

  it('passes other messages through', async () => {
    expect(await dispatchUserBridge({ type: 'overseer:user.other' })).toBeUndefined()
    expect(listGitCredentials).not.toHaveBeenCalled()
  })
})
