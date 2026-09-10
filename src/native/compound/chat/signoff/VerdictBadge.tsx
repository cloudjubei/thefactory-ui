import { Text, View } from 'react-native'

import type { SignoffVerdict } from '../../../../headless'
import {
  nativeRadii,
  type NativeSemanticTheme,
  type NativeStatusTokens,
} from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type VerdictBadgeProps = {
  verdict: SignoffVerdict
}

type BadgeLook = { bg: string; fg: string; border: string; dashed: boolean }

/** Bold status palette for a verdict; the two undecided states draw as absence. */
function badgeLook(
  key: SignoffVerdict['key'],
  theme: NativeSemanticTheme,
  status: NativeStatusTokens,
): BadgeLook {
  switch (key) {
    case 'proven':
      return { bg: status.done.bg, fg: status.done.fg, border: status.done.bg, dashed: false }
    case 'failed':
      return { bg: status.stuck.bg, fg: status.stuck.fg, border: status.stuck.bg, dashed: false }
    case 'partly':
      return { bg: 'transparent', fg: status.review.softFg, border: status.review.bg, dashed: true }
    case 'not-run':
      return {
        bg: 'transparent',
        fg: status.queued.softFg,
        border: theme.border.strong,
        dashed: true,
      }
  }
}

/**
 * The verdict word as a bold status badge. Fill law: a filled dot marks a
 * verdict, a hollow dot marks a state nobody has decided yet.
 */
export default function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const { theme, status } = useNativeTheme()
  const look = badgeLook(verdict.key, theme, status)
  return (
    <View
      accessibilityLabel={verdict.word}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 24,
        paddingHorizontal: 8,
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderStyle: look.dashed ? 'dashed' : 'solid',
        borderColor: look.border,
        backgroundColor: look.bg,
      }}
    >
      {verdict.hollow ? (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: nativeRadii.round,
            borderWidth: 1.5,
            borderColor: look.fg,
          }}
        />
      ) : (
        <View
          style={{ width: 6, height: 6, borderRadius: nativeRadii.round, backgroundColor: look.fg }}
        />
      )}
      <Text style={{ fontSize: 12, fontWeight: '600', color: look.fg }}>{verdict.word}</Text>
    </View>
  )
}
