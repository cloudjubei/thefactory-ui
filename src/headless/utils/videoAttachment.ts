import { VIDEO_REASON_NO_FFMPEG, VIDEO_TRANSCRIPT_NOTES } from 'thefactory-tools/constants'
import type { VideoDigestStage, VideoTokenEstimate } from 'thefactory-tools/types'
import { formatVideoTime, videoTokenNotice } from 'thefactory-tools/utils'
import { formatBytes } from './path'
import {
  VIDEO_ATTACHMENT_TEXT,
  VIDEO_NOTICE_SEPARATOR,
  VIDEO_STAGE_LABELS,
  VIDEO_STAGE_ORDER,
  VIDEO_TRANSCRIPT_SHORT,
} from './videoAttachmentConstants'
import type {
  ChatVideoDigest,
  VideoAttachmentView,
  VideoCostView,
  VideoStep,
  VideoTranscriptNote,
} from './videoAttachmentTypes'

type VideoPreparingStage = (typeof VIDEO_STAGE_ORDER)[number]

const isPreparing = (stage: VideoDigestStage): stage is VideoPreparingStage =>
  (VIDEO_STAGE_ORDER as readonly VideoDigestStage[]).includes(stage)

function stageLine(stage: VideoPreparingStage, percent: number | undefined): string {
  const label = VIDEO_STAGE_LABELS[stage]
  return percent === undefined ? label : `${label} ${Math.round(percent)}%`
}

function videoCost(tokens: VideoTokenEstimate, rough: boolean): VideoCostView {
  const full = videoTokenNotice(tokens)
  const [read = full, closer = ''] = full.split(VIDEO_NOTICE_SEPARATOR)
  return { read, closer, full, rough }
}

function transcriptNote({ transcript }: ChatVideoDigest): VideoTranscriptNote | undefined {
  if (!transcript || transcript === 'done') return undefined
  return {
    short: VIDEO_TRANSCRIPT_SHORT[transcript],
    long: VIDEO_TRANSCRIPT_NOTES[transcript],
    warn: transcript === 'not-set-up' || transcript === 'failed',
  }
}

function videoSteps(stage: VideoDigestStage, percent: number | undefined): VideoStep[] {
  const at = isPreparing(stage) ? VIDEO_STAGE_ORDER.indexOf(stage) : VIDEO_STAGE_ORDER.length
  return [
    { label: VIDEO_ATTACHMENT_TEXT.uploaded, state: 'done' },
    ...VIDEO_STAGE_ORDER.map((id, index): VideoStep => {
      if (index < at) return { label: VIDEO_STAGE_LABELS[id], state: 'done' }
      if (index > at) return { label: VIDEO_STAGE_LABELS[id], state: 'todo' }
      return { label: stageLine(id, percent), state: 'active' }
    }),
  ]
}

/**
 * A video as its chip shows it, from how its digest stands. Until the first
 * answer it reads as the first stage: a digest begins the moment the upload ends.
 */
export function videoAttachmentView(digest: ChatVideoDigest | undefined): VideoAttachmentView {
  const stage = digest?.stage ?? 'probing'
  const percent = digest?.percent
  const length = digest?.durationSec ? formatVideoTime(digest.durationSec) : undefined
  const size = formatBytes(digest?.sizeBytes) ?? undefined
  const facts = [length, size].filter(Boolean).join(' · ')
  const common = {
    ...(digest?.poster ? { poster: digest.poster } : {}),
    ...(length ? { length } : {}),
    ...(size ? { size } : {}),
    ...(facts ? { facts } : {}),
    ...(digest?.width && digest.height
      ? { frame: { width: digest.width, height: digest.height } }
      : {}),
  }
  if (stage === 'failed') {
    return {
      state: 'failed',
      ...(digest?.reason ? { line: digest.reason } : {}),
      canSetUp: digest?.reason === VIDEO_REASON_NO_FFMPEG,
      steps: [],
      ...common,
    }
  }
  const cost = digest?.tokens ? videoCost(digest.tokens, stage !== 'ready') : undefined
  if (stage === 'ready') {
    const transcript = digest ? transcriptNote(digest) : undefined
    return {
      state: 'ready',
      ...(cost ? { cost } : {}),
      ...(transcript ? { transcript } : {}),
      canSetUp: digest?.transcript === 'not-set-up',
      steps: [],
      ...common,
    }
  }
  return {
    state: 'preparing',
    line: stageLine(stage, percent),
    ...(cost ? { cost } : {}),
    canSetUp: false,
    steps: videoSteps(stage, percent),
    ...common,
  }
}

/** The figures as a chip's pill says them: the whole notice, or the reading cost alone where room is short. */
export function videoCostLabel(cost: VideoCostView, compact = false): string {
  const figures = compact ? cost.read : cost.full
  return cost.rough ? `${VIDEO_ATTACHMENT_TEXT.roughPrefix}${figures}` : figures
}
