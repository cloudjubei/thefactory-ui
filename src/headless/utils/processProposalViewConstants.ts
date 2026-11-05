/** What a step that runs only when work is sent back to it adds to its chip's name. */
export const ONLY_WHEN_SENT_BACK_SUFFIX = ' — only if sent back'

/** The device a capture or verify step drives, as a person reads it. */
export const CAPTURE_DEVICE_LABELS = {
  android: 'Android emulator',
  ios: 'iOS simulator',
  web: 'Web browser',
} as const

/** What a launch says about the device, beside its steps. */
export const CAPTURE_DEVICE_LINE = (device: string): string => `Captures on ${device}`
