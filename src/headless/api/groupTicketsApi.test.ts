import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import { readGroupTickets, startGroupTicketPlan } from './groupTicketsApi'

beforeEach(() => {
  client.get.mockReset().mockResolvedValue({ data: 'answer' })
  client.post.mockReset().mockResolvedValue({ data: 'answer' })
})

describe('the ticket calls', () => {
  it('read the first page with no token, the group id encoded', async () => {
    expect(await readGroupTickets('o s c')).toBe('answer')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/groups/o%20s%20c/tickets',
      throwOnError: true,
    })
  })

  it('read a later page by its token', async () => {
    await readGroupTickets('osc', 'p2')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/groups/osc/tickets',
      query: { nextPageToken: 'p2' },
      throwOnError: true,
    })
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
})
