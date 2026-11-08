import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  listConnectionNewItems: vi.fn(),
  markConnectionItemsSeen: vi.fn(),
}))

vi.mock('./generated', () => sdk)

import { listConnectionNewItems, markConnectionItemsSeen } from './connectorSyncApi'

const COUNTS = { connectionId: 'c1', identityEpoch: 'e1', newCount: 2, uncertainCount: 0 }

beforeEach(() => {
  sdk.listConnectionNewItems.mockReset().mockResolvedValue({ data: [COUNTS] })
  sdk.markConnectionItemsSeen.mockReset().mockResolvedValue({ data: { ...COUNTS, newCount: 0 } })
})

describe('the new-items calls', () => {
  it('read every connection’s counts through the generated call', async () => {
    expect(await listConnectionNewItems()).toEqual([COUNTS])
    expect(sdk.listConnectionNewItems).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('mark items seen on the connection by id, under the identity they were listed under', async () => {
    const items = [{ provider: 'jira', externalId: 'ENG-7', sourceTenant: 't1' }]
    expect(await markConnectionItemsSeen('c/1', 'e1', items)).toEqual({ ...COUNTS, newCount: 0 })
    expect(sdk.markConnectionItemsSeen).toHaveBeenCalledWith({
      path: { id: 'c/1' },
      body: { identityEpoch: 'e1', items },
      throwOnError: true,
    })
  })

  it('let a refused call throw to its caller', async () => {
    sdk.markConnectionItemsSeen.mockRejectedValue(new Error('409'))
    await expect(markConnectionItemsSeen('c1', 'old', [])).rejects.toThrow('409')
  })
})
