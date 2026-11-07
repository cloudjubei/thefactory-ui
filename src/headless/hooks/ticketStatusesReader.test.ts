import { describe, expect, it, vi } from 'vitest'

import { TICKET_TRANSITION_FIELD } from '../utils/ticketConnectionConstants'
import { TicketStatusesReader } from './ticketStatusesReader'

describe('TicketStatusesReader', () => {
  it('starts reading', () => {
    expect(new TicketStatusesReader(vi.fn()).getState()).toEqual({ kind: 'reading' })
  })

  it('holds the list it read, for the connection and keys asked', async () => {
    const list = vi.fn(async () => ['Done'])
    const reader = new TicketStatusesReader(list)
    await reader.read('c1', ['ENG'])
    expect(list).toHaveBeenCalledWith('c1', ['ENG'])
    expect(reader.getState()).toEqual({ kind: 'ready', statuses: ['Done'] })
  })

  it('says why when it gets no list', async () => {
    const reader = new TicketStatusesReader(async () => {
      throw new Error('This token cannot read Jira statuses.')
    })
    await reader.read('c1', [])
    expect(reader.getState()).toEqual({
      kind: 'failed',
      reason: 'This token cannot read Jira statuses.',
    })
  })

  it('treats an empty list as nothing to pick from', async () => {
    const reader = new TicketStatusesReader(async () => [])
    await reader.read('c1', [])
    expect(reader.getState()).toEqual({
      kind: 'failed',
      reason: TICKET_TRANSITION_FIELD.noStatuses,
    })
  })

  it('drops a read a newer one overtook, whichever way it ends', async () => {
    const answers: ((statuses: string[]) => void)[] = []
    const fails: ((err: Error) => void)[] = []
    const reader = new TicketStatusesReader(
      () =>
        new Promise((resolve, reject) => {
          answers.push(resolve)
          fails.push(reject)
        }),
    )
    const first = reader.read('c1', [])
    const second = reader.read('c1', ['ENG'])
    const third = reader.read('c2', [])
    answers[0]!(['Old'])
    fails[1]!(new Error('old'))
    answers[2]!(['New'])
    await Promise.all([first, second, third])
    expect(reader.getState()).toEqual({ kind: 'ready', statuses: ['New'] })
  })

  it('goes back to reading for the wait before a read, dropping what was on its way', async () => {
    let answer: (statuses: string[]) => void = () => {}
    const reader = new TicketStatusesReader(() => new Promise((resolve) => (answer = resolve)))
    const reading = reader.read('c1', [])
    reader.begin()
    answer(['Old'])
    await reading
    expect(reader.getState()).toEqual({ kind: 'reading' })
  })

  it('says so when there is no connection, dropping what was on its way', async () => {
    let answer: (statuses: string[]) => void = () => {}
    const reader = new TicketStatusesReader(() => new Promise((resolve) => (answer = resolve)))
    const reading = reader.read('c1', [])
    reader.none()
    answer(['Old'])
    await reading
    expect(reader.getState()).toEqual({
      kind: 'failed',
      reason: TICKET_TRANSITION_FIELD.noConnection,
    })
  })

  it('tells whoever listens, until they stop', async () => {
    const reader = new TicketStatusesReader(async () => ['Done'])
    const listener = vi.fn()
    const stop = reader.subscribe(listener)
    await reader.read('c1', [])
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
    reader.begin()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
