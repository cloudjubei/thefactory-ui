import type { ReviewTone } from '../../../../headless'
import {
  nativePalette,
  type NativeSemanticTheme,
  type NativeStatusTokens,
} from '../../../../tokens/native'

export type ToneChip = { bg: string; border: string; fg: string; dashed: boolean }

/** Web's `text-green-700 dark:text-green-400` and friends, resolved for the active scheme. */
export function toneText(tone: ReviewTone, theme: NativeSemanticTheme): string {
  const dark = theme.colorScheme === 'dark'
  switch (tone) {
    case 'positive':
      return dark ? nativePalette.green[400] : nativePalette.green[700]
    case 'warning':
      return dark ? nativePalette.orange[400] : nativePalette.orange[700]
    case 'danger':
      return dark ? nativePalette.red[400] : nativePalette.red[700]
    case 'neutral':
    case 'absent':
      return theme.text.secondary
  }
}

export function toneChip(
  tone: ReviewTone,
  theme: NativeSemanticTheme,
  status: NativeStatusTokens,
): ToneChip {
  switch (tone) {
    case 'positive':
      return {
        bg: status.done.softBg,
        border: status.done.softBorder,
        fg: status.done.softFg,
        dashed: false,
      }
    case 'warning':
      return {
        bg: status.working.softBg,
        border: status.working.softBorder,
        fg: status.working.softFg,
        dashed: false,
      }
    case 'danger':
      return {
        bg: status.stuck.softBg,
        border: status.stuck.softBorder,
        fg: status.stuck.softFg,
        dashed: false,
      }
    case 'neutral':
      return {
        bg: theme.surface.hover,
        border: theme.border.subtle,
        fg: theme.text.secondary,
        dashed: false,
      }
    case 'absent':
      return {
        bg: 'transparent',
        border: theme.border.strong,
        fg: theme.text.secondary,
        dashed: true,
      }
  }
}
