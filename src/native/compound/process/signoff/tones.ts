import type { CodeReviewTone, SignoffTimePart } from '../../../../headless'
import {
  nativePalette,
  type NativeStatusTokens,
  type NativeStatusVariant,
} from '../../../../tokens/native'

/** A review tone as the package's own status variant — neutral is the empty grey. */
export function reviewToneVariant(
  tone: CodeReviewTone,
  status: NativeStatusTokens,
): NativeStatusVariant {
  return tone === 'neutral' ? status.empty : status[tone]
}

/** Where time went, as a bar segment's fill — the package palette, one hue per part. */
export const TIME_PART_FILL: Record<SignoffTimePart, string> = {
  thinking: nativePalette.purple[500],
  tools: nativePalette.blue[500],
  system: nativePalette.gray[400],
  checks: nativePalette.green[500],
  other: nativePalette.gray[200],
}
