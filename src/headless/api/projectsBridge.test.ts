import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  listProjects: vi.fn(),
}))

import { listProjects } from './generated'
import { dispatchProjectsBridge } from './projectsBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchProjectsBridge', () => {
  it('lists projects', async () => {
    asMock(listProjects).mockResolvedValue({
      data: [
        { id: 'p1', title: 'One' },
        { id: 'p2', title: 'Two' },
      ],
    })
    const res = await dispatchProjectsBridge({ type: 'overseer:projects.list' })
    expect(listProjects).toHaveBeenCalledWith({ throwOnError: true })
    expect(res).toEqual([
      { id: 'p1', title: 'One' },
      { id: 'p2', title: 'Two' },
    ])
  })

  it('returns undefined for non-projects messages', async () => {
    expect(await dispatchProjectsBridge({ type: 'overseer:data.query' })).toBeUndefined()
    expect(listProjects).not.toHaveBeenCalled()
  })

  it('throws on an unknown projects op', async () => {
    await expect(dispatchProjectsBridge({ type: 'overseer:projects.nope' })).rejects.toThrow(
      /unknown/i,
    )
  })

  it('surfaces the real backend error message from the axios response body', async () => {
    asMock(listProjects).mockRejectedValue({
      message: 'Request failed with status code 500',
      response: { data: { error: 'project store unavailable' } },
    })
    await expect(dispatchProjectsBridge({ type: 'overseer:projects.list' })).rejects.toThrow(
      'project store unavailable',
    )
  })
})
