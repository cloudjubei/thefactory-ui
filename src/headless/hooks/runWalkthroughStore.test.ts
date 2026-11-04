import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunWalkthroughItem } from '../utils/runWalkthroughTypes'

const api = vi.hoisted(() => ({
  readRunWalkthrough: vi.fn(),
  attachRunWalkthroughLink: vi.fn(),
  attachRunWalkthroughFile: vi.fn(),
}))

vi.mock('../api/runWalkthroughApi', () => api)

import { RunWalkthroughStore } from './runWalkthroughStore'

const item = (id: string, over: Partial<RunWalkthroughItem> = {}): RunWalkthroughItem => ({
  id,
  projectId: 'web',
  evidenceId: `e-${id}`,
  title: id,
  open: 'The page',
  steps: ['Do it'],
  mustShow: ['It'],
  ...over,
})

const linked = (id: string) =>
  item(id, { result: { kind: 'link', url: 'https://loom.com/1', evidenceId: 'r' } })

const video = { name: 'a.mp4', size: 3, blob: new Blob(['abc']) }

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const refusal = (status: number, error: string) => ({
  isAxiosError: true,
  response: { status, data: { error } },
})

const sender = () => ({ apiBaseUrl: 'http://b', token: 't', sendFileFromUri: undefined })

const loaded = async (items: RunWalkthroughItem[]) => {
  api.readRunWalkthrough.mockResolvedValueOnce(items)
  const store = new RunWalkthroughStore('r1', sender)
  await store.refresh()
  return store
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
})

describe('RunWalkthroughStore', () => {
  it('holds the items once read', async () => {
    const store = await loaded([item('a')])
    expect(api.readRunWalkthrough).toHaveBeenCalledWith('r1')
    expect(store.getState().items?.map((i) => i.id)).toEqual(['a'])
  })

  it('has nothing to show of a run it cannot read', async () => {
    api.readRunWalkthrough.mockRejectedValue(refusal(404, 'No checkout.'))
    const store = new RunWalkthroughStore('r1', sender)
    await store.refresh()
    expect(store.getState().items).toBeUndefined()
  })

  it('keeps what it has when a later read fails', async () => {
    const store = await loaded([item('a')])
    api.readRunWalkthrough.mockRejectedValue(refusal(404, 'No checkout.'))
    await store.refresh()
    expect(store.getState().items).toHaveLength(1)
  })

  it('drops a read a newer one overtook', async () => {
    const first = deferred<RunWalkthroughItem[]>()
    const second = deferred<RunWalkthroughItem[]>()
    api.readRunWalkthrough.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const store = new RunWalkthroughStore('r1', sender)
    const a = store.refresh()
    const b = store.refresh()
    second.resolve([item('new')])
    await b
    first.resolve([item('old')])
    await a
    expect(store.getState().items?.map((i) => i.id)).toEqual(['new'])
  })

  it('tells who listens, and stops once they leave', async () => {
    api.readRunWalkthrough.mockResolvedValue([])
    const store = new RunWalkthroughStore('r1', sender)
    const listener = vi.fn()
    const leave = store.subscribe(listener)
    await store.refresh()
    expect(listener).toHaveBeenCalled()
    listener.mockClear()
    leave()
    await store.refresh()
    expect(listener).not.toHaveBeenCalled()
  })

  describe('attaching a link', () => {
    it('puts the updated item in its place, the link trimmed', async () => {
      const store = await loaded([item('a'), item('b')])
      api.attachRunWalkthroughLink.mockResolvedValue(linked('a'))
      expect(await store.attachLink('a', '  https://loom.com/1 ')).toBe(true)
      expect(api.attachRunWalkthroughLink).toHaveBeenCalledWith('r1', 'a', 'https://loom.com/1')
      const { items, sending } = store.getState()
      expect(items?.map((i) => i.id)).toEqual(['a', 'b'])
      expect(items?.[0]?.result?.kind).toBe('link')
      expect(sending).toEqual({})
    })

    it('marks the item while it is sent', async () => {
      const store = await loaded([item('a')])
      const sent = deferred<RunWalkthroughItem>()
      api.attachRunWalkthroughLink.mockReturnValue(sent.promise)
      const going = store.attachLink('a', 'https://loom.com/1')
      expect(store.getState().sending).toEqual({ a: { kind: 'link' } })
      sent.resolve(linked('a'))
      await going
    })

    it('sends nothing for a bad link, and says why on the item', async () => {
      const store = await loaded([item('a')])
      expect(await store.attachLink('a', 'loom.com/1')).toBe(false)
      expect(api.attachRunWalkthroughLink).not.toHaveBeenCalled()
      expect(store.getState().errors).toEqual({
        a: 'A link must start with http:// or https://.',
      })
    })

    it('sends nothing for an empty box', async () => {
      const store = await loaded([item('a')])
      expect(await store.attachLink('a', '   ')).toBe(false)
      expect(api.attachRunWalkthroughLink).not.toHaveBeenCalled()
    })

    it('says why the backend refused, on that item alone', async () => {
      const store = await loaded([item('a'), item('b')])
      api.attachRunWalkthroughLink.mockRejectedValue(refusal(404, 'No such step.'))
      expect(await store.attachLink('a', 'https://loom.com/1')).toBe(false)
      expect(store.getState().errors).toEqual({ a: 'No such step.' })
      expect(store.getState().sending).toEqual({})
    })

    it('clears the reason on the next try', async () => {
      const store = await loaded([item('a')])
      api.attachRunWalkthroughLink.mockRejectedValueOnce({})
      await store.attachLink('a', 'https://loom.com/1')
      expect(store.getState().errors).toEqual({ a: 'The link was not added.' })
      api.attachRunWalkthroughLink.mockResolvedValue(linked('a'))
      await store.attachLink('a', 'https://loom.com/1')
      expect(store.getState().errors).toEqual({})
    })

    it('sends one thing at a time to an item', async () => {
      const store = await loaded([item('a')])
      const sent = deferred<RunWalkthroughItem>()
      api.attachRunWalkthroughLink.mockReturnValue(sent.promise)
      const first = store.attachLink('a', 'https://loom.com/1')
      expect(await store.attachLink('a', 'https://loom.com/2')).toBe(false)
      expect(await store.attachFile('a', video)).toBe(false)
      sent.resolve(linked('a'))
      await first
      expect(api.attachRunWalkthroughLink).toHaveBeenCalledTimes(1)
      expect(api.attachRunWalkthroughFile).not.toHaveBeenCalled()
    })
  })

  describe('attaching a video', () => {
    it('shows how far it got, then puts the updated item in its place', async () => {
      const store = await loaded([item('a')])
      const sent = deferred<RunWalkthroughItem>()
      api.attachRunWalkthroughFile.mockReturnValue(sent.promise)
      const going = store.attachFile('a', video)
      expect(store.getState().sending).toEqual({ a: { kind: 'file' } })
      const options = api.attachRunWalkthroughFile.mock.calls[0]?.[3]
      expect(options).toMatchObject({ apiBaseUrl: 'http://b', token: 't' })
      options.onProgress(1, 3)
      expect(store.getState().sending).toEqual({ a: { kind: 'file', sentBytes: 1, totalBytes: 3 } })
      sent.resolve(item('a', { result: { kind: 'video', name: 'a.mp4', evidenceId: 'r' } }))
      expect(await going).toBe(true)
      expect(api.attachRunWalkthroughFile.mock.calls[0]?.slice(0, 3)).toEqual(['r1', 'a', video])
      expect(store.getState().items?.[0]?.result?.kind).toBe('video')
      expect(store.getState().sending).toEqual({})
    })

    it('ignores progress that arrives after it finished', async () => {
      const store = await loaded([item('a')])
      api.attachRunWalkthroughFile.mockResolvedValue(item('a'))
      await store.attachFile('a', video)
      api.attachRunWalkthroughFile.mock.calls[0]?.[3].onProgress(3, 3)
      expect(store.getState().sending).toEqual({})
    })

    it('says why it failed, with its own words as the last resort', async () => {
      const store = await loaded([item('a')])
      api.attachRunWalkthroughFile.mockRejectedValueOnce(new Error('Too large.'))
      expect(await store.attachFile('a', video)).toBe(false)
      expect(store.getState().errors).toEqual({ a: 'Too large.' })
      api.attachRunWalkthroughFile.mockRejectedValueOnce({})
      await store.attachFile('a', video)
      expect(store.getState().errors).toEqual({ a: 'The video was not uploaded.' })
    })
  })

  it('leaves a result a read begun while it was sent had not seen', async () => {
    const store = await loaded([item('a')])
    const sent = deferred<RunWalkthroughItem>()
    api.attachRunWalkthroughLink.mockReturnValue(sent.promise)
    const attaching = store.attachLink('a', 'https://loom.com/1')
    const read = deferred<RunWalkthroughItem[]>()
    api.readRunWalkthrough.mockReturnValueOnce(read.promise)
    const reading = store.refresh()
    sent.resolve(linked('a'))
    await attaching
    read.resolve([item('a')])
    await reading
    expect(store.getState().items?.[0]?.result?.kind).toBe('link')
  })

  it('leaves a result a slower read had not seen', async () => {
    const store = await loaded([item('a')])
    const read = deferred<RunWalkthroughItem[]>()
    api.readRunWalkthrough.mockReturnValueOnce(read.promise)
    const reading = store.refresh()
    api.attachRunWalkthroughLink.mockResolvedValue(linked('a'))
    await store.attachLink('a', 'https://loom.com/1')
    read.resolve([item('a')])
    await reading
    expect(store.getState().items?.[0]?.result?.kind).toBe('link')
  })
})
