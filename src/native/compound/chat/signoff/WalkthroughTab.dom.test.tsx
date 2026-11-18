import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ content: vi.fn() }))
vi.mock('../../../../headless/api', () => ({ getReviewEvidenceContent: api.content }))
vi.mock('../../../../headless', async () => ({
  ...(await import('../../../../headless/hooks/useReviewEvidenceImage')),
  useReviewEvidenceMediaUrl: () => ({ url: undefined, loading: false }),
  fileNameSlug: () => 'recording',
  formatBytes: () => '100 B',
  VIDEO_PAIRS_COPY: {},
}))
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))
vi.mock('../../../hooks/useNativeTheme', async () => ({
  useNativeTheme: () => ({ theme: nativeLightTheme, status: {} }),
  // Only the native presentation boundary is replaced; the byte-fetch hook is real.
}))
import { nativeLightTheme } from '../../../../tokens/native'
vi.mock('../../../icons', () => ({ IconDownload: () => null }))
vi.mock('../../../primitives/Button', () => ({
  Button: ({
    children,
    onPress,
    disabled,
    accessibilityLabel,
  }: {
    children: ReactNode
    onPress: () => void
    disabled?: boolean
    accessibilityLabel: string
  }) => (
    <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
}))
import WalkthroughTab from './WalkthroughTab'

const tile = {
  caption: 'Recording',
  ref: {
    id: 'video',
    runId: 'run',
    projectId: 'project',
    kind: 'recording' as const,
    path: 'video.mp4',
    mediaType: 'video/mp4',
    bytes: 100,
    createdAt: 0,
  },
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('native recording save', () => {
  it('shows a byte-fetch failure, enables retry and saves the retried bytes', async () => {
    api.content.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: 'video' })
    const save = vi.fn()
    render(<WalkthroughTab projectId="project" recordings={[tile]} onSaveFile={save} />)
    expect(api.content).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save the recording' }))
    await screen.findByText('The recording could not be saved. Try again.')
    const retry = screen.getByRole('button', { name: 'Save the recording' })
    expect(retry.hasAttribute('disabled')).toBe(false)
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(retry)
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        name: 'recording.mp4',
        dataUri: `data:video/mp4;base64,${btoa('video')}`,
      }),
    )
    expect(api.content).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('The recording could not be saved. Try again.')).toBeNull()
  })
})
