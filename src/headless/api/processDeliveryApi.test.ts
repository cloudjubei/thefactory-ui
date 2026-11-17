import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import {
  publishProcessGroup,
  readProcessDelivery,
  saveProcessPublishEdits,
} from './processDeliveryApi'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

beforeEach(() => {
  for (const fn of [client.get, client.post, client.put]) {
    fn.mockReset()
    fn.mockResolvedValue({ data: 'answer' })
  }
})

describe('the delivery calls', () => {
  it('read a run’s delivery, the id encoded', async () => {
    expect(await readProcessDelivery({ kind: 'run', runId: 'r 1' })).toBe('answer')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/process-runs/r%201/delivery',
      throwOnError: true,
    })
  })

  it('read a group run’s delivery', async () => {
    await readProcessDelivery({ kind: 'group', groupRunId: 'g1' })
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g1/delivery',
      throwOnError: true,
    })
  })

  it('keep the card’s edits whole', async () => {
    const body = { repos: [{ projectId: 'web', short: 'dark mode', prTitle: 'Add dark mode' }] }
    expect(await saveProcessPublishEdits({ kind: 'run', runId: 'r1' }, body)).toBe('answer')
    expect(client.put).toHaveBeenCalledWith({
      url: '/api/v1/process-runs/r1/delivery',
      body,
      headers: JSON_HEADERS,
      throwOnError: true,
    })
  })

  it('publish a group run, saying which client did', async () => {
    const body = { repos: [], decidedVia: 'mobile' as const }
    expect(await publishProcessGroup('g/1', body)).toBe('answer')
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g%2F1/publish',
      body,
      headers: JSON_HEADERS,
      throwOnError: true,
    })
  })

  it('pass a refusal on', async () => {
    client.get.mockRejectedValue(new Error('down'))
    await expect(readProcessDelivery({ kind: 'run', runId: 'r1' })).rejects.toThrow('down')
  })
})
