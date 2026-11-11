import { describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import { readProcessTryBuild } from './processTryBuildApi'

describe('readProcessTryBuild', () => {
  it('reads the run’s phone build, the id encoded', async () => {
    client.get.mockResolvedValue({ data: { runId: 'r 1', offered: false, steps: [] } })
    expect(await readProcessTryBuild('r 1')).toEqual({ runId: 'r 1', offered: false, steps: [] })
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/process-runs/r%201/try-build',
      throwOnError: true,
    })
  })

  it('passes a refusal on', async () => {
    client.get.mockRejectedValue(new Error('404'))
    await expect(readProcessTryBuild('r1')).rejects.toThrow('404')
  })
})
