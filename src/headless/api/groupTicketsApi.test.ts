import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import {
  readGroupTickets,
  startGroupTicketDiscussion,
  startGroupTicketPlan,
} from './groupTicketsApi'

beforeEach(() => {
  client.get.mockReset().mockResolvedValue({ data: 'answer' })
  client.post.mockReset().mockResolvedValue({ data: 'answer' })
})

describe('the ticket calls', () => {
  it('read the person’s by default, the group id encoded', async () => {
    expect(await readGroupTickets('o s c')).toBe('answer')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/groups/o%20s%20c/tickets',
      query: {},
      throwOnError: true,
    })
  })

  it('read a list by name, and a later page by its token', async () => {
    await readGroupTickets('osc', { view: 'sprint', nextPageToken: 'p2' })
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/groups/osc/tickets',
      query: { view: 'sprint', nextPageToken: 'p2' },
      throwOnError: true,
    })
  })

  it('search by what was typed', async () => {
    await readGroupTickets('osc', { view: 'search', q: 'znr-780' })
    expect(client.get.mock.calls[0]?.[0].query).toEqual({ view: 'search', q: 'znr-780' })
  })

  it('start a plan with an empty body, the agent the person runs on', async () => {
    expect(await startGroupTicketPlan('osc', 'ENG/7')).toBe('answer')
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/groups/osc/tickets/ENG%2F7/plan',
      body: {},
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('start a plan on the agent picked', async () => {
    await startGroupTicketPlan('osc', 'ENG-7', { runner: 'cli', cliTool: 'claude' })
    expect(client.post.mock.calls[0]?.[0].body).toEqual({ runner: 'cli', cliTool: 'claude' })
  })

  it('open a discussion with an empty body, the key encoded', async () => {
    expect(await startGroupTicketDiscussion('osc', 'ENG/7')).toBe('answer')
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/groups/osc/tickets/ENG%2F7/discuss',
      body: {},
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('open a discussion on the agent picked', async () => {
    await startGroupTicketDiscussion('osc', 'ENG-7', { runner: 'api' })
    expect(client.post.mock.calls[0]?.[0].body).toEqual({ runner: 'api' })
  })
})
