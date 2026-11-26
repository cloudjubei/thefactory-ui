import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('./generated/client.gen', () => ({ client }))

import { listRecordingSites, startRecordingSiteSignIn } from './recordingSitesApi'

const LOOM = { id: 'loom', name: 'Loom', state: 'unknown', signingIn: false }

beforeEach(() => {
  client.get.mockReset()
  client.post.mockReset()
})

describe('the recording site calls', () => {
  it('list the person’s sites', async () => {
    client.get.mockResolvedValue({ data: { sites: [LOOM] } })
    expect(await listRecordingSites()).toEqual([LOOM])
    expect(client.get).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/v1/recording-sites', throwOnError: true }),
    )
  })

  it('start a site’s sign-in, answering the site as it now stands', async () => {
    client.post.mockResolvedValue({ data: { ...LOOM, signingIn: true } })
    expect(await startRecordingSiteSignIn('loom')).toEqual({ ...LOOM, signingIn: true })
    expect(client.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/recording-sites/{siteId}/sign-in',
        path: { siteId: 'loom' },
        throwOnError: true,
      }),
    )
  })
})
