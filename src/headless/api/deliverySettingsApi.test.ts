import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ patch: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import { saveGroupDelivery } from './deliverySettingsApi'

beforeEach(() => {
  client.patch.mockReset()
  client.patch.mockResolvedValue({ data: {} })
})

describe('saveGroupDelivery', () => {
  it('patches the group with the setting, the id encoded', async () => {
    await saveGroupDelivery('a b', { prFirst: true })
    expect(client.patch).toHaveBeenCalledWith({
      url: '/api/v1/projects-groups/a%20b',
      body: { delivery: { prFirst: true } },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('clears it with null', async () => {
    await saveGroupDelivery('g', null)
    expect(client.patch.mock.calls[0]![0].body).toEqual({ delivery: null })
  })

  it('passes a refusal on', async () => {
    client.patch.mockRejectedValue(new Error('no'))
    await expect(saveGroupDelivery('g', {})).rejects.toThrow('no')
  })
})
