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

export type ChatVideoPlayerProps = {
  playback: UseVideoPlayback
  posterUrl: string | null | undefined
  /** Set by the card, for its full screen button. */
  fullscreenRef: { current: (() => void) | null }
}

/** The browser's own player, reading the video in ranges from its signed URL. */
export default function ChatVideoPlayer({
  playback,
  posterUrl,
  fullscreenRef,
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
