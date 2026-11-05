import type { ReactNode } from 'react'
import type { VideoFrame } from '../../../../headless'

/** One file the panel is handing to the host to put somewhere the user can reach. */
export type SaveFileRequest = {
  /** Suggested file name, extension included. */
  name: string
  /** The bytes, as a `data:` URI. */
  dataUri: string
}

/**
 * Save a file on the user's behalf.
 *
 * A host slot rather than something this package does itself: writing a file
 * where a person can find it needs a platform capability (a share sheet, a
 * media library) that a pure component library has no business depending on —
 * the same reason `onOpenGit` is passed in. An app that cannot save omits it,
 * and every save affordance stays hidden rather than failing when pressed.
 */
export type SaveFileHandler = (file: SaveFileRequest) => void | Promise<void>

/** What a chat video's card asks of the player playing it. */
export type InlineVideoHandle = {
  enterFullscreen: () => void
}

/** A chat video for the host's player, streamed from a signed URL. */
export type InlineVideo = {
  uri: string
  /** Where to carry on from when `uri` changes, as it does when a URL runs out. */
  startAtSec?: number
  /** Set by the player while it is mounted. */
  handleRef: { current: InlineVideoHandle | null }
  onMetadata: (frame: VideoFrame) => void
  /** The player gave up, in the player's words, at that time. */
  onFailed: (message: string, atSec: number) => void
  onPlayingChange: (playing: boolean) => void
}

/**
 * What the app hosting the review surfaces supplies for media this package
 * cannot play itself: a video player, handed the recording as a `data:` URI,
 * and one for a chat's video, by URL. Left out, a recording is named and sized
 * instead of played, and a chat's video stays a poster with its details.
 */
export type MediaHost = {
  renderVideo?: (dataUri: string) => ReactNode
  renderInlineVideo?: (video: InlineVideo) => ReactNode
}
