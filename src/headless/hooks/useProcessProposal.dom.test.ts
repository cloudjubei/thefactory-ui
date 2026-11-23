import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ preview: vi.fn() }))
vi.mock('../api', () => ({
  previewProcess: api.preview,
  useAuth: () => ({ token: 't' }),
}))

import { useProcessProposal } from './useProcessProposal'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useProcessProposal planning', () => {
  it('previews the launch as planning first when the card leaves planning on', async () => {
    api.preview.mockResolvedValue({ data: { planning: true } })
    const { result } = renderHook(() =>
      useProcessProposal({ projectId: 'p', storyId: 's', planning: true }),
    )
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(api.preview.mock.calls[0]?.[0].body).not.toHaveProperty('planning')
  })

  it('previews the launch without its plan step once the card turns planning off', async () => {
    api.preview.mockResolvedValue({ data: { planning: false } })
    const { result } = renderHook(() =>
      useProcessProposal({ projectId: 'p', storyId: 's', planning: false }),
    )
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(api.preview.mock.calls[0]?.[0].body).toMatchObject({ planning: false })
  })
})
