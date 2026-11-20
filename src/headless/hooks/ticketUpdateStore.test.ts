import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ readTicketUpdate: vi.fn(), postTicketUpdate: vi.fn() }))
vi.mock('../api/ticketUpdateApi', () => api)

import { TICKET_UPDATE_COPY } from '../utils/ticketUpdateConstants'
import type { TicketUpdateData } from '../utils/ticketUpdateTypes'
import { TicketUpdateStore } from './ticketUpdateStore'

const GROUP = { kind: 'group', groupRunId: 'grun1' } as const
const READY: TicketUpdateData = {
  offered: true,
  label: 'Slack Message',
  text: 'ABC-1',
  channel: { kind: 'channel', name: 'team', permalink: 'https://acme.slack.com/archives/C1' },
  problems: [],
}
const POSTED: TicketUpdateData = {
  ...READY,
  posted: {
    channel: 'C1',
    ts: '1.2',
    permalink: 'https://acme.slack.com/archives/C1/p12',
    postedAt: '2026-11-20T10:00:00.000Z',
  },
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

beforeEach(() => {
  api.readTicketUpdate.mockReset().mockResolvedValue(READY)
  api.postTicketUpdate.mockReset().mockResolvedValue(POSTED)
})

describe('TicketUpdateStore', () => {
  it('reads the update of its work, once for reads asked together', async () => {
    const store = new TicketUpdateStore(GROUP)
    await Promise.all([store.refresh(), store.refresh()])
    expect(api.readTicketUpdate).toHaveBeenCalledTimes(1)
    expect(api.readTicketUpdate).toHaveBeenCalledWith(GROUP)
    expect(store.getState()).toEqual({ data: READY, readError: null, posting: false, error: null })
  })

  it('says why a read failed, keeping what it read before', async () => {
    const store = new TicketUpdateStore(GROUP)
    await store.refresh()
    api.readTicketUpdate.mockRejectedValue(new Error('down'))
    await store.refresh()
    expect(store.getState()).toMatchObject({ data: READY, readError: 'down' })
  })

  it('shows the post going at once, then where it went', async () => {
    const store = new TicketUpdateStore(GROUP)
    await store.refresh()
    const sent = deferred<TicketUpdateData>()
    api.postTicketUpdate.mockReturnValue(sent.promise)
    const seen: boolean[] = []
    store.subscribe(() => seen.push(store.getState().posting))
    const posting = store.post()
    expect(store.getState().posting).toBe(true)
    sent.resolve(POSTED)
    expect(await posting).toBe(true)
    expect(store.getState()).toMatchObject({ data: POSTED, posting: false, error: null })
    expect(seen).toEqual([true, false])
  })

  it('makes a second press while it goes the same press, and posts nothing once posted', async () => {
    const store = new TicketUpdateStore(GROUP)
    await store.refresh()
    const sent = deferred<TicketUpdateData>()
    api.postTicketUpdate.mockReturnValue(sent.promise)
    const first = store.post()
    const second = store.post()
    sent.resolve(POSTED)
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(await store.post()).toBe(true)
    expect(api.postTicketUpdate).toHaveBeenCalledTimes(1)
  })

  it('rolls back with why when the post is refused, and posts on the next press', async () => {
    const store = new TicketUpdateStore(GROUP)
    await store.refresh()
    api.postTicketUpdate.mockRejectedValueOnce(new Error('Slack did not post the update.'))
    expect(await store.post()).toBe(false)
    expect(store.getState()).toMatchObject({
      data: READY,
      posting: false,
      error: 'Slack did not post the update.',
    })
    expect(await store.post()).toBe(true)
    expect(store.getState()).toMatchObject({ data: POSTED, error: null })
  })

  it('says a refusal with no words of its own in the card’s', async () => {
    const store = new TicketUpdateStore(GROUP)
    api.postTicketUpdate.mockRejectedValue({})
    expect(await store.post()).toBe(false)
    expect(store.getState().error).toBe(TICKET_UPDATE_COPY.failed)
  })
})
