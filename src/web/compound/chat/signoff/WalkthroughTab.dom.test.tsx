import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EvidenceTile } from '../../../../headless'

const grant = vi.hoisted(() => ({ url: 'https://media.test/video?grant=one' }))
vi.mock('../../../../headless', () => ({
  useReviewEvidenceMediaUrl: () => ({ url: grant.url, loading: false }),
  VIDEO_PAIRS_COPY: {},
}))
import WalkthroughTab from './WalkthroughTab'

const tile: EvidenceTile = {
  caption: 'Recording',
  ref: {
    id: 'video',
    runId: 'run',
    projectId: 'project',
    kind: 'recording',
    path: 'video.mp4',
    mediaType: 'video/mp4',
    bytes: 100,
    createdAt: 0,
  },
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  grant.url = 'https://media.test/video?grant=one'
})

describe('WalkthroughTab signed URL rotation', () => {
  it.each([true, false])(
    'preserves playhead and playing=%s through source-reset events',
    (playing) => {
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      const props = { projectId: 'project', recordings: [tile] }
      const { container, rerender } = render(<WalkthroughTab {...props} />)
      const video = container.querySelector('video')!
      fireEvent.loadedMetadata(video)
      video.currentTime = 37
      fireEvent.timeUpdate(video)
      fireEvent.play(video)
      if (!playing) fireEvent.pause(video)
      play.mockClear()

      grant.url = 'https://media.test/video?grant=two'
      rerender(<WalkthroughTab {...props} />)
      expect(video.src).toBe(grant.url)
      // The browser resets the transport when src changes, not a user pause/seek.
      video.currentTime = 0
      fireEvent.pause(video)
      fireEvent.timeUpdate(video)
      fireEvent.emptied(video)
      fireEvent.loadedMetadata(video)
      expect(video.currentTime).toBe(37)
      fireEvent.pause(video)
      fireEvent.timeUpdate(video)
      expect(play).not.toHaveBeenCalled()
      fireEvent.seeked(video)
      expect(play).toHaveBeenCalledTimes(playing ? 1 : 0)

      // Normal user interaction after restoration is tracked for the next grant.
      fireEvent.pause(video)
      video.currentTime = 52
      fireEvent.timeUpdate(video)
      grant.url = 'https://media.test/video?grant=three'
      rerender(<WalkthroughTab {...props} />)
      video.currentTime = 0
      fireEvent.pause(video)
      fireEvent.timeUpdate(video)
      fireEvent.loadedMetadata(video)
      expect(video.currentTime).toBe(52)
      play.mockClear()
      fireEvent.seeked(video)
      expect(play).not.toHaveBeenCalled()
    },
  )
})
