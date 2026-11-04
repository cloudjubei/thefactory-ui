export const CHAT_ATTACHMENT_UPLOAD_MEDIA_TYPE = 'application/octet-stream'

/** The least time between two progress reports, so a fast upload does not redraw the composer per chunk. */
export const CHAT_UPLOAD_MIN_REPORT_MS = 200
/** How much each new speed sample counts against the running average, so time left does not jump. */
export const CHAT_UPLOAD_RATE_SMOOTHING = 0.2
export const CHAT_UPLOAD_MIN_RATE_WINDOW_MS = 500

export const CHAT_UPLOAD_TEXT = {
  stop: 'Stop',
  stopAsk: 'Stop upload?',
  keep: 'Keep',
  retry: 'Try again',
  dismiss: (name: string) => `Dismiss ${name}`,
  stopLabel: (name: string) => `Stop upload of ${name}`,
  costLater: 'Cost shown after upload',
  sendHeld: 'Send works once the upload is done',
  failed: 'The upload failed.',
  stoppedAt: (percent: number) => `The upload stopped at ${percent}%.`,
  noUriSender: 'This app cannot send a file from its path.',
  underAMinute: 'under a minute left',
  minutesLeft: (minutes: number) => `about ${minutes} min left`,
  hoursLeft: (hours: number) => `about ${hours} hr left`,
} as const
