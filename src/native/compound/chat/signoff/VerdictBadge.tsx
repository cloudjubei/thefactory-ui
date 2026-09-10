import { Text, View } from 'react-native'

import type { SignoffVerdict } from '../../../../headless'
import { nativeRadii, type NativeStatusTokens } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type VerdictBadgeProps = {
  verdict: SignoffVerdict
}

type BadgeLook = { bg: string; fg: string; border: string; dashed: boolean }

/** Bold status palette for a verdict; the two undecided states draw as absence. */
function badgeLook(key: SignoffVerdict['key'], status: NativeStatusTokens): BadgeLook {
  switch (key) {
    case 'proven':
      return { bg: status.done.bg, fg: status.done.fg, border: status.done.bg, dashed: false }
    case 'failed':
      return { bg: status.stuck.bg, fg: status.stuck.fg, border: status.stuck.bg, dashed: false }
    // A verdict is always a SOLID pill; its absence signal is the hollow dot
    // alone. Dashed belongs to the check CHIPS ("nobody looked") and means
    // something different there. Both undecided verdicts take review blue — the
    // hue for "not proven" — never the grey that means "not set up".
    case 'partly':
      return { bg: status.review.bg, fg: status.review.fg, border: status.review.bg, dashed: false }
    case 'not-run':
      return { bg: status.review.bg, fg: status.review.fg, border: status.review.bg, dashed: false }
  }
}

/**
 * The verdict word as a bold status badge. Fill law: a filled dot marks a
 * verdict, a hollow dot marks a state nobody has decided yet.
 */
export default function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const { status } = useNativeTheme()
  const look = badgeLook(verdict.key, status)
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
