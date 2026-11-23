import type { VideoFramePlace } from 'thefactory-tools/types'

/** Between a still's lines of text, as one row says them. */
export const VIDEO_TIMELINE_TEXT_SEPARATOR = ' · '

/** A timeline is read again this long before its picture URLs run out. */
export const VIDEO_TIMELINE_REFRESH_MARGIN_MS = 30_000

/** Two moments this close count as one time, for the row at the playhead. */
export const VIDEO_TIMELINE_PLAYHEAD_SLACK_SEC = 0.05

/** Where on the frame a close-up was cut from, as its viewer says it. */
export const VIDEO_TIMELINE_PLACE: Record<VideoFramePlace, string> = {
  'top left': 'Top left of the screen',
  top: 'Top of the screen',
  'top right': 'Top right of the screen',
  left: 'Left of the screen',
  middle: 'Middle of the screen',
  right: 'Right of the screen',
  'bottom left': 'Bottom left of the screen',
  bottom: 'Bottom of the screen',
  'bottom right': 'Bottom right of the screen',
}

export const VIDEO_TIMELINE_TEXT = {
  toggle: 'Timeline',
  toggleLabel: (name: string) => `Timeline of ${name}`,
  caption: 'Timeline',
  moments: (count: number) => `${count} ${count === 1 ? 'moment' : 'moments'}`,
  loading: 'Reading the timeline…',
  notStarted: 'Not read yet',
  empty: 'Nothing on the timeline yet',
  failed: 'The timeline could not be made.',
  noText: 'No text on screen',
  onEveryScreen: (text: string) => `On every screen: ${text}`,
  closeUp: (place: string, text: string) =>
    text ? `Close-up, ${place}: ${text}` : `Close-up, ${place}`,
  failedAction: (text: string) => `${text}, failed`,
  playFrom: (time: string) => `Play from ${time}`,
  back: 'Back',
  mark: 'Mark',
  markFrom: (time: string) => `Mark ${time}…`,
  markSent: 'Sent',
  markWaiting: 'In your message',
  noNote: 'No note',
  openCloseUp: (time: string) => `Open the close-up at ${time}`,
  closeUpCount: (at: number, total: number) =>
    `${at} of ${total} ${total === 1 ? 'close-up' : 'close-ups'}`,
  closeUpTitle: (time: string) => `Close-up ${time}`,
  previousCloseUp: 'Previous close-up',
  nextCloseUp: 'Next close-up',
  close: 'Close',
} as const
