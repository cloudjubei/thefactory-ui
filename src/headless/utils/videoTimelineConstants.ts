/** Between a still's lines of text, as one row says them. */
export const VIDEO_TIMELINE_TEXT_SEPARATOR = ' · '

/** A timeline is read again this long before its picture URLs run out. */
export const VIDEO_TIMELINE_REFRESH_MARGIN_MS = 30_000

/** Two moments this close count as one time, for the row at the playhead. */
export const VIDEO_TIMELINE_PLAYHEAD_SLACK_SEC = 0.05

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
} as const
