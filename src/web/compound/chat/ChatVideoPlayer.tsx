import { useEffect, useRef } from 'react'

import { videoFailureKind, type UseVideoPlayback } from '../../../headless'

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

/** An iPhone's browser has only its own way to full screen a video. */
function enterFullscreen(video: FullscreenVideo): void {
  if (video.requestFullscreen) {
    void video.requestFullscreen().catch(() => video.webkitEnterFullscreen?.())
    return
  }
  video.webkitEnterFullscreen?.()
}

/** What the card asks of the player while it is mounted. */
export type ChatVideoPlayerControl = {
  /** Plays on from that moment. */
  seek: (atSec: number) => void
  pause: () => void
  /** Where the playhead is now. */
  time: () => number
}

export type ChatVideoPlayerProps = {
  playback: UseVideoPlayback
  posterUrl: string | null | undefined
  /** Set by the card, for its full screen button. */
  fullscreenRef: { current: (() => void) | null }
  /** Set while mounted, for the timeline's times and the flag. */
  controlRef?: { current: ChatVideoPlayerControl | null }
  /** Where the playhead is, as it moves. */
  onTime?: (atSec: number) => void
}

/** The browser's own player, reading the video in ranges from its signed URL. */
export default function ChatVideoPlayer({
  playback,
  posterUrl,
  fullscreenRef,
  controlRef,
  onTime,
}: ChatVideoPlayerProps) {
  const { state, onMetadata, onPlaying, onFailed, onFullscreenTaken } = playback
  const videoRef = useRef<FullscreenVideo>(null)
  const url = state.source?.url

  useEffect(() => {
    fullscreenRef.current = () => {
      if (videoRef.current) enterFullscreen(videoRef.current)
    }
    return () => {
      fullscreenRef.current = null
    }
  }, [fullscreenRef])

  useEffect(() => {
    if (!controlRef) return
    controlRef.current = {
      seek: (atSec) => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = atSec
        video.play().catch(() => {})
      },
      pause: () => videoRef.current?.pause(),
      time: () => videoRef.current?.currentTime ?? 0,
    }
    return () => {
      controlRef.current = null
    }
  }, [controlRef])

  useEffect(() => {
    if (!state.fullscreenPending || !videoRef.current) return
    enterFullscreen(videoRef.current)
    onFullscreenTaken()
  }, [state.fullscreenPending, onFullscreenTaken])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    video.src = url
    // Refused only when the browser wants a press first; its own controls are there for that.
    video.play().catch(() => {})
    return () => {
      // Taking a <video> out of the page does not end its download: without this it keeps one of
      // the six connections a browser allows a server, and enough closed cards stall the rest.
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [url])

  return (
    <video
      ref={videoRef}
      poster={posterUrl ?? undefined}
      controls
      playsInline
      preload="metadata"
      className="absolute inset-0 h-full w-full bg-black"
      onPlay={onPlaying}
      onTimeUpdate={onTime ? ({ currentTarget: video }) => onTime(video.currentTime) : undefined}
      onLoadedMetadata={({ currentTarget: video }) => {
        onMetadata({ width: video.videoWidth, height: video.videoHeight })
        if (state.startAtSec) video.currentTime = state.startAtSec
      }}
      onError={({ currentTarget: video }) =>
        onFailed(videoFailureKind(video.error?.code), video.currentTime)
      }
    />
  )
}
