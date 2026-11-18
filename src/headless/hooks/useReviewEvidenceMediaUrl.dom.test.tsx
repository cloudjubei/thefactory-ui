import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ read: vi.fn(), base: 'https://backend/' }))
vi.mock('../api/ApiContext', () => ({ useOptionalApi: () => ({ apiBaseUrl: mocks.base }) }))
vi.mock('../api/reviewEvidenceMediaApi', () => ({ readReviewEvidenceMediaUrl: mocks.read }))
import { useReviewEvidenceMediaUrl } from './useReviewEvidenceMediaUrl'

beforeEach(() => {
  vi.useFakeTimers()
  mocks.read.mockReset().mockImplementation(async () => ({
    url: '/content?mediaToken=signed',
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useReviewEvidenceMediaUrl', () => {
  it('requests only a grant and returns an absolute URL, rotating before expiry', async () => {
    const { result, unmount } = renderHook(() => useReviewEvidenceMediaUrl('p', 'e'))
    await act(async () => {})
    expect(mocks.read).toHaveBeenCalledWith('p', 'e')
    expect(result.current.url).toBe('https://backend/content?mediaToken=signed')
    await act(() => vi.advanceTimersByTimeAsync(90_000))
    expect(mocks.read).toHaveBeenCalledTimes(2)
    unmount()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(mocks.read).toHaveBeenCalledTimes(2)
  })

  it('ignores a late response for previous evidence', async () => {
    let resolve!: (value: { url: string; expiresAt: string }) => void
    mocks.read.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, rerender } = renderHook(({ id }) => useReviewEvidenceMediaUrl('p', id), {
      initialProps: { id: 'old' },
    })
    rerender({ id: 'new' })
    await act(async () => {})
    await act(async () => resolve({ url: '/old', expiresAt: '2999-01-01' }))
    expect(result.current.url).toBe('https://backend/content?mediaToken=signed')
  })

  it('does not mint without an evidence id and clears the previous URL', async () => {
    const { result, rerender } = renderHook(({ id }) => useReviewEvidenceMediaUrl('p', id), {
      initialProps: { id: 'e' as string | undefined },
    })
    await act(async () => {})
    rerender({ id: undefined })
    expect(result.current.url).toBeUndefined()
    await act(() => vi.advanceTimersByTimeAsync(120_000))
    expect(mocks.read).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed grant and retries without fetching media bytes', async () => {
    mocks.read.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useReviewEvidenceMediaUrl('p', 'e'))
    await act(async () => {})
    expect(result.current.error).toBe(true)
    expect(result.current.url).toBeUndefined()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(result.current.error).toBe(false)
    expect(result.current.url).toContain('mediaToken=')
  })
})
