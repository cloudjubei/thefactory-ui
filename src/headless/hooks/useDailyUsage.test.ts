import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getDailyUsage: vi.fn(),
  recomputeDailyUsage: vi.fn(),
}))

vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  ...api,
}))

import { loadDailyUsage, rebuildDailyUsage } from './useDailyUsage'

describe('loadDailyUsage', () => {
  beforeEach(() => {
    api.getDailyUsage.mockReset()
    api.recomputeDailyUsage.mockReset()
  })

  it('reads the summaries of the last `days` UTC days up to now', async () => {
    const day = { day: '2026-10-19' }
    api.getDailyUsage.mockResolvedValue({
      data: { fromDay: '2026-10-13', toDay: '2026-10-19', summaries: [day] },
    })
    expect(await loadDailyUsage(Date.parse('2026-10-19T08:00:00.000Z'), 7)).toEqual([day])
    expect(api.getDailyUsage).toHaveBeenCalledWith({
      query: { fromDay: '2026-10-13', toDay: '2026-10-19' },
      throwOnError: true,
    })
  })

  it('reads a longer range when asked for more days', async () => {
    api.getDailyUsage.mockResolvedValue({ data: { summaries: [] } })
    await loadDailyUsage(Date.parse('2026-10-19T08:00:00.000Z'), 30)
    expect(api.getDailyUsage).toHaveBeenCalledWith({
      query: { fromDay: '2026-09-20', toDay: '2026-10-19' },
      throwOnError: true,
    })
  })

  it('lets a failed read through for the hook to word', async () => {
    api.getDailyUsage.mockRejectedValue(new Error('down'))
    await expect(loadDailyUsage(Date.parse('2026-10-19T08:00:00.000Z'), 30)).rejects.toThrow('down')
  })
})

describe('rebuildDailyUsage', () => {
  it('asks the backend to rebuild from the latest summarized day and returns the days written', async () => {
    api.recomputeDailyUsage.mockResolvedValue({
      data: { days: ['2026-10-19'], events: 3, rulesVersion: 3 },
    })
    expect(await rebuildDailyUsage()).toEqual(['2026-10-19'])
    expect(api.recomputeDailyUsage).toHaveBeenCalledWith({ body: {}, throwOnError: true })
  })
})
