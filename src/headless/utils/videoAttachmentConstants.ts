import type { VideoDigestStage, VideoTranscriptState } from 'thefactory-tools/types'

/** Between the two figures of `videoTokenNotice`. */
export const VIDEO_NOTICE_SEPARATOR = ' · '

export const VIDEO_STAGE_ORDER = [
  'probing',
  'picking-frames',
  'making-sheets',
  'transcribing',
] as const satisfies readonly VideoDigestStage[]

export const VIDEO_STAGE_LABELS: Record<(typeof VIDEO_STAGE_ORDER)[number], string> = {
  probing: 'Checking',
  'picking-frames': 'Picking frames',
  'making-sheets': 'Making sheets',
  transcribing: 'Transcribing',
}

export const VIDEO_TRANSCRIPT_SHORT: Record<Exclude<VideoTranscriptState, 'done'>, string> = {
  'no-audio': 'No audio',
  'no-speech': 'No speech heard',
  'not-set-up': 'No transcript',
  failed: 'Transcript failed',
}

export const VIDEO_ATTACHMENT_TEXT = {
  uploaded: 'Uploaded',
  roughPrefix: 'Rough: ',
  costTitle: 'What this video costs',
  costNote:
    'Agents read the stills and the transcript first. A closer look is one more still, when an agent asks for it.',
  costLater: 'The cost shows once the video is read.',
  setUp: 'Set up',
  details: (name: string) => `Details of ${name}`,
  remove: (name: string) => `Remove ${name}`,
} as const
