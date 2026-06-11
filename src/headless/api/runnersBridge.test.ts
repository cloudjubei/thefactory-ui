import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  createRunnerPairing: vi.fn(),
  listRunners: vi.fn(),
  removeRunner: vi.fn(),
}))

import { createRunnerPairing, listRunners, removeRunner } from './generated'
import { dispatchRunnersBridge } from './runnersBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchRunnersBridge', () => {
  it('creates a pairing', async () => {
    asMock(createRunnerPairing).mockResolvedValue({ data: { pin: '123456', pairingId: 'p1' } })
    const res = await dispatchRunnersBridge({ type: 'overseer:runners.create-pairing' })
    expect(createRunnerPairing).toHaveBeenCalledWith({ throwOnError: true })
    expect(res).toEqual({ pin: '123456', pairingId: 'p1' })
  })

  it('lists runners', async () => {
    asMock(listRunners).mockResolvedValue({ data: { runners: [{ id: 'r1', name: 'box' }] } })
    const res = await dispatchRunnersBridge({ type: 'overseer:runners.list' })
    expect(listRunners).toHaveBeenCalledWith({ throwOnError: true })
    expect(res).toEqual({ runners: [{ id: 'r1', name: 'box' }] })
  })

  it('removes a runner by id', async () => {
    asMock(removeRunner).mockResolvedValue({ data: { removed: true } })
    const res = await dispatchRunnersBridge({
      type: 'overseer:runners.remove',
      payload: { runnerId: 'r1' },
    })
    expect(removeRunner).toHaveBeenCalledWith({ path: { runnerId: 'r1' }, throwOnError: true })
    expect(res).toEqual({ removed: true })
  })

  it('throws when runners.remove has no runnerId', async () => {
    await expect(
      dispatchRunnersBridge({ type: 'overseer:runners.remove', payload: {} }),
    ).rejects.toThrow(/runnerId/i)
    expect(removeRunner).not.toHaveBeenCalled()
  })

  it('returns undefined for non-runners messages', async () => {
    expect(await dispatchRunnersBridge({ type: 'overseer:data.query' })).toBeUndefined()
    expect(createRunnerPairing).not.toHaveBeenCalled()
  })

  it('throws on an unknown runners op', async () => {
    await expect(dispatchRunnersBridge({ type: 'overseer:runners.nope' })).rejects.toThrow(
      /unknown/i,
    )
  })

  it('surfaces the real backend error message from the axios response body', async () => {
    asMock(createRunnerPairing).mockRejectedValue({
      message: 'Request failed with status code 500',
      response: { data: { error: 'pairing store unavailable' } },
    })
    await expect(
      dispatchRunnersBridge({ type: 'overseer:runners.create-pairing' }),
    ).rejects.toThrow('pairing store unavailable')
  })
})
