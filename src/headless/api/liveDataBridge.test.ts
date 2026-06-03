import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  readProjectLiveData: vi.fn(),
}))

import { readProjectLiveData } from './generated'
import { dispatchLiveDataBridge } from './liveDataBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchLiveDataBridge', () => {
  it("reads the project's subscribed records for live-data.read", async () => {
    asMock(readProjectLiveData).mockResolvedValue({
      data: [{ sourceId: 's1', recordType: 'stock-quote', records: [] }],
    })
    const res = await dispatchLiveDataBridge('p1', { type: 'overseer:live-data.read' })
    expect(readProjectLiveData).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      throwOnError: true,
    })
    expect(res).toEqual([{ sourceId: 's1', recordType: 'stock-quote', records: [] }])
  })

  it('returns undefined for non-live-data messages', async () => {
    expect(await dispatchLiveDataBridge('p1', { type: 'overseer:data.query' })).toBeUndefined()
    expect(readProjectLiveData).not.toHaveBeenCalled()
  })

  it('throws without an active project', async () => {
    await expect(
      dispatchLiveDataBridge(undefined, { type: 'overseer:live-data.read' }),
    ).rejects.toThrow(/project/i)
  })

  it('throws for an unknown live-data op', async () => {
    await expect(
      dispatchLiveDataBridge('p1', { type: 'overseer:live-data.frobnicate' }),
    ).rejects.toThrow()
  })
})
