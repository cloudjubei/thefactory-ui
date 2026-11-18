import { describe, expect, it, vi } from 'vitest'
const post = vi.hoisted(() => vi.fn())
vi.mock('./generated/client.gen', () => ({ client: { post } }))
import { readReviewEvidenceMediaUrl } from './reviewEvidenceMediaApi'

describe('evidence media grant', () => {
  it('encodes both identifiers and requests a signed URL, not content bytes', async () => {
    const grant = { url: '/content?mediaToken=scoped', expiresAt: '2030-01-01' }
    post.mockResolvedValue({ data: grant })
    expect(await readReviewEvidenceMediaUrl('project /', 'evidence /')).toEqual(grant)
    expect(post).toHaveBeenCalledExactlyOnceWith({
      url: '/api/v1/projects/project%20%2F/review-evidence/evidence%20%2F/media-url',
      throwOnError: true,
    })
  })
})
