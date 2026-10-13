import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ listStories: vi.fn(), getStoriesOrder: vi.fn() }))

vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  ...api,
}))

import { prefetchProjectStories } from './StoriesContext'

const ok = (data: unknown, etag: string) => ({ status: 200, data, headers: { etag } })

describe('prefetchProjectStories', () => {
  beforeEach(() => {
    api.listStories.mockReset()
    api.getStoriesOrder.mockReset()
    api.listStories.mockResolvedValue(ok([{ id: 's1', title: 'One' }], 'W/"s"'))
    api.getStoriesOrder.mockResolvedValue(ok(['s1'], 'W/"o"'))
  })

  it("reads a project's stories ahead of opening it, once however often it is asked", async () => {
    await Promise.all([prefetchProjectStories('pa'), prefetchProjectStories('pa')])
    expect(api.listStories).toHaveBeenCalledTimes(1)
    expect(api.getStoriesOrder).toHaveBeenCalledTimes(1)
  })

  it('reads nothing for a project whose stories it already holds — opening it re-reads them', async () => {
    await prefetchProjectStories('pb')
    await prefetchProjectStories('pb')
    expect(api.listStories).toHaveBeenCalledTimes(1)
  })

  it('swallows a failed read, and tries again next time', async () => {
    api.listStories.mockRejectedValueOnce(new Error('down'))
    await expect(prefetchProjectStories('pc')).resolves.toBeUndefined()
    await prefetchProjectStories('pc')
    expect(api.listStories).toHaveBeenCalledTimes(2)
  })
})
