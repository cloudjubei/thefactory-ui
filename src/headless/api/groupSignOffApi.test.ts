import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  instance: { get: vi.fn() },
  getConfig: vi.fn(() => ({ baseURL: 'http://backend' })),
}))

vi.mock('./generated/client.gen', () => ({ client }))

import {
  decideGroupSignOff,
  readGroupSignOff,
  readSignOffAttachment,
  readSignOffOutput,
  retryGroupSignOff,
  saveSignOffOutput,
} from './groupSignOffApi'

beforeEach(() => {
  for (const fn of [client.get, client.post, client.put, client.instance.get]) {
    fn.mockReset()
    fn.mockResolvedValue({ data: 'answer' })
  }
})

describe('the group sign-off calls', () => {
  it('read the sign-off, the id encoded', async () => {
    expect(await readGroupSignOff('g 1')).toBe('answer')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g%201/sign-off',
      throwOnError: true,
    })
  })

  it('send the decision whole, saying which client took it', async () => {
    const body = {
      choice: 'request-changes' as const,
      legId: 'be',
      note: 'Fix it',
      requestedProof: ['screens' as never],
      decidedVia: 'web' as const,
    }
    expect(await decideGroupSignOff('g1', body)).toBe('answer')
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g1/sign-off',
      body,
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('retry with no body, on the sign-off’s own route', async () => {
    expect(await retryGroupSignOff('g1')).toBe('answer')
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g1/sign-off/retry',
      throwOnError: true,
    })
  })

  it('read and save one output by its version', async () => {
    expect(await readSignOffOutput('g1', 'ev/1')).toBe('answer')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g1/outputs/ev%2F1',
      throwOnError: true,
    })
    expect(await saveSignOffOutput('g1', 'ev1', 'new text')).toBe('answer')
    expect(client.put).toHaveBeenCalledWith({
      url: '/api/v1/process-group-runs/g1/outputs/ev1',
      body: { text: 'new text' },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('fetch an attachment’s bytes from its path under the API', async () => {
    const bytes = new ArrayBuffer(2)
    client.instance.get.mockResolvedValue({ data: bytes })
    expect(
      await readSignOffAttachment('/projects/be/review-evidence/e/content?download=true'),
    ).toBe(bytes)
    expect(client.instance.get).toHaveBeenCalledWith(
      '/api/v1/projects/be/review-evidence/e/content?download=true',
      { baseURL: 'http://backend', responseType: 'arraybuffer', timeout: 0 },
    )
  })
})
