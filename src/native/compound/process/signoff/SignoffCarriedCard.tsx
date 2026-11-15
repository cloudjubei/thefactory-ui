import { Text, View } from 'react-native'

import type { SignoffCarriedView } from '../../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

/**
 * Beside the build to try at a sign-off: "Try these" — the points no proving
 * step showed, carried on by a person, each group with what was shown — and
 * the targets left out of the proof, with where they already failed.
 * Web peer: `web/compound/process/signoff/SignoffCarriedCard`.
 */
export default function SignoffCarriedCard({ view }: { view: SignoffCarriedView }) {
  const { theme, status } = useNativeTheme()
  const { tryThese, leftOut } = view
  return (
    <View
      accessibilityLabel={tryThese?.title ?? leftOut?.title}
      style={{
        gap: nativeSpace[3],
        padding: nativeSpace[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[4],
        backgroundColor: theme.surface.raised,
      }}
    >
      {tryThese ? (
        <View style={{ gap: nativeSpace[2] }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
              {tryThese.title}
            </Text>
            <Text style={{ fontSize: 12, color: status.working.softFg }}>{tryThese.note}</Text>
          </View>
          {tryThese.groups.map((group) => (
            <View key={group.key} style={{ gap: 2 }}>
              {group.points.map((point) => (
                <Text
                  key={point}
                  style={{ fontSize: 13, lineHeight: 18, color: theme.text.primary }}
                >
                  {`• ${point}`}
                </Text>
              ))}
              {group.shown ? (
                <Text style={{ fontSize: 12, color: theme.text.muted }}>{group.shown}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {leftOut ? (
        <View
          style={{
            gap: nativeSpace[1],
            ...(tryThese
              ? {
                  borderTopWidth: 1,
                  borderTopColor: theme.border.subtle,
                  paddingTop: nativeSpace[3],
                }
              : {}),
          }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
            {leftOut.title}
          </Text>
          {leftOut.rows.map((row) => (
            <View key={row.key} style={{ gap: 2 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: nativeFontFamilies.mono,
                  color: theme.text.primary,
                }}
              >
                {row.target}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.detail}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
