import type {
  VideoDigestStage,
  VideoTokenEstimate,
  VideoTranscriptState,
} from 'thefactory-tools/types'
import type { ChatContext } from '../api/generated'
import type { VideoFrame } from './videoPlaybackTypes'

/** How the digest of a chat's video stands, as `GET /chat-attachments/digest` and `chatAttachments:digest` say. */
export type ChatVideoDigest = {
  stage: VideoDigestStage
  percent?: number
  reason?: string
  tokens?: VideoTokenEstimate
  /** The first still, project-relative. */
  poster?: string
  transcript?: VideoTranscriptState
  durationSec?: number
  /** As shown, rotation applied. Known once the digest is ready: a player reads it before that. */
  width?: number
  height?: number
  sizeBytes?: number
}

/** The `chatAttachments:digest` event. */
export type ChatVideoDigestEvent = {
  path: string
  status: ChatVideoDigest
}

export type VideoCostView = {
  /** "≈ 6.2k tokens to read". */
  read: string
  /** "≈ 1.6k per closer look". */
  closer: string
  /** Both, as the chip shows them where there is room. */
  full: string
  /** The length is known but the video is not read yet, so the figure may still move. */
  rough: boolean
}

export type VideoTranscriptNote = {
  short: string
  long: string
  /** Something went wrong, rather than the video simply having no speech. */
  warn: boolean
}

export type VideoStepState = 'done' | 'active' | 'todo'

export type VideoStep = {
  label: string
  state: VideoStepState
}

export type VideoAttachmentState = 'preparing' | 'ready' | 'failed'

/** A video as its chip shows it. */
export type VideoAttachmentView = {
  state: VideoAttachmentState
  /** The one line: the stage and percent while preparing, the reason on failure. */
  line?: string
  cost?: VideoCostView
  transcript?: VideoTranscriptNote
  /** The failure is one setup can fix, so the chip links to it. */
  canSetUp: boolean
  poster?: string
  /** `04:12` on the poster. */
  length?: string
  size?: string
  /** "04:12 · 186 MB". */
  facts?: string
  /** Its size as shown, so the card can take its shape before the video loads. */
  frame?: VideoFrame
  steps: VideoStep[]
}

/** A showcase scene's stand-in for a video's signed URLs. */
export type ChatVideoFixedMedia = {
  video: string
  still?: string
}

/** Where a chat's videos read how they stand: bound to the chat, as the digest routes are. */
export type ChatVideoAttachments = {
  context: ChatContext
  /** Opens Settings › Video, for a failure setup can fix. */
  onOpenSetup?: () => void
  /** A fixed answer per path in place of the backend's, for a showcase scene. */
  fixedDigests?: Record<string, ChatVideoDigest>
  /** The fixed URLs per path to go with them. */
  fixedMedia?: Record<string, ChatVideoFixedMedia>
}
