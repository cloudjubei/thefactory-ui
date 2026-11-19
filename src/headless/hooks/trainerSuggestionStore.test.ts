import { describe, expect, it, vi } from 'vitest'
import type { GetActivityResponse } from '../api/generated'
import { TrainerSuggestionStore, trainerActivityLabel } from './trainerSuggestionStore'

const activity = (
  status: string,
  extra: Partial<GetActivityResponse> = {},
): GetActivityResponse => ({
  activityId: 'a1',
  scope: 'p1',
  recordType: 'run',
  status,
  steps: [{ key: 'train', done: 2, total: 8, status }],
  startedAt: '2026-11-01',
  updatedAt: '2026-11-01',
  ...extra,
})

describe('TrainerSuggestionStore', () => {
  it('starts only on a press, guards concurrent/repeated presses, and follows activity progress', async () => {
    let finish!: (handle: { activityId: string; queued: boolean }) => void
    const launch = vi.fn(
      () =>
        new Promise<{ activityId: string; queued: boolean }>((resolve) => {
          finish = resolve
        }),
    )
    const read = vi.fn().mockResolvedValue(activity('running'))
    const store = new TrainerSuggestionStore(launch, read)
    expect(launch).not.toHaveBeenCalled()
    const pending = store.launch()
    await store.launch()
    expect(launch).toHaveBeenCalledTimes(1)
    expect(trainerActivityLabel(store.snapshot())).toBe('Launching…')
    finish({ activityId: 'a1', queued: true })
    await pending
    expect(read).toHaveBeenCalledWith('a1')
    expect(trainerActivityLabel(store.snapshot())).toBe('Running')
    expect(store.snapshot().activity?.steps[0]?.done).toBe(2)
    await store.launch()
    expect(launch).toHaveBeenCalledTimes(1)
    read.mockResolvedValue(activity('completed'))
    await store.refresh()
    expect(trainerActivityLabel(store.snapshot())).toBe('Completed')
  })

  it('shows a launch refusal and allows retry, but never relaunches on a status read failure', async () => {
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Queue full'))
      .mockResolvedValue({ activityId: 'a1', queued: true })
    const store = new TrainerSuggestionStore(
      launch,
      vi.fn().mockRejectedValue(new Error('Offline')),
    )
    await store.launch()
    expect(store.snapshot().error).toBe('Queue full')
    await store.launch()
    expect(store.snapshot().activityId).toBe('a1')
    expect(store.snapshot().error).toBe('Offline')
    expect(trainerActivityLabel(store.snapshot())).toBe('Queued')
    await store.launch()
    expect(launch).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['queued', {}, 'Queued'],
    ['running', { isLive: false }, 'Paused — not progressing'],
    ['failed', { error: 'Worker failed' }, 'Failed'],
    ['aborted', {}, 'Stopped'],
  ])('shows %s honestly', (status, extra, label) => {
    expect(
      trainerActivityLabel({
        launching: false,
        activityId: 'a1',
        activity: activity(status, extra),
      }),
    ).toBe(label)
  })

  it('does not allow an older status request to overwrite a newer read', async () => {
    let old!: (value: GetActivityResponse) => void
    const read = vi
      .fn()
      .mockResolvedValueOnce(activity('running'))
      .mockImplementationOnce(
        () =>
          new Promise<GetActivityResponse>((resolve) => {
            old = resolve
          }),
      )
      .mockResolvedValueOnce(activity('completed'))
    const store = new TrainerSuggestionStore(
      async () => ({ activityId: 'a1', queued: false }),
      read,
    )
    await store.launch()
    const pending = store.refresh()
    await store.refresh()
    old(activity('running'))
    await pending
    expect(trainerActivityLabel(store.snapshot())).toBe('Completed')
  })
})
