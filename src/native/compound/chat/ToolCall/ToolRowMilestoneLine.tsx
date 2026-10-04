import { Linking, Pressable, Text, View } from 'react-native'
import type { ToolRowMilestone } from '../../../../headless'
import { nativePalette, nativeRadii } from '../../../../tokens/native'

const TONE: Record<ToolRowMilestone['tone'], { bg: string; border: string; fg: string }> = {
  waiting: {
    bg: nativePalette.teal[50],
    border: nativePalette.teal[300],
    fg: nativePalette.teal[800],
  },
  success: {
    bg: nativePalette.green[50],
    border: nativePalette.green[300],
    fg: nativePalette.green[800],
  },
  warning: {
    bg: nativePalette.orange[50],
    border: nativePalette.orange[300],
    fg: nativePalette.orange[800],
  },
  error: { bg: nativePalette.red[50], border: nativePalette.red[300], fg: nativePalette.red[800] },
}

/**
 * Native peer of the web `ToolRowMilestoneLine`: the line under a tool row that
 * marks where its work stands — waiting on the user, or what it did.
 */
export default function ToolRowMilestoneLine({ milestone }: { milestone: ToolRowMilestone }) {
  const tone = TONE[milestone.tone]
  const link = milestone.link
  return (
    <View
      style={{
        marginHorizontal: 10,
        marginBottom: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: tone.border,
        backgroundColor: tone.bg,
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: tone.fg }}>{milestone.title}</Text>
      {milestone.detail ? (
        <Text style={{ fontSize: 11, color: tone.fg }}>{milestone.detail}</Text>
      ) : null}
      {link ? (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(link.url)}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: tone.fg,
              textDecorationLine: 'underline',
            }}
          >
            {`${link.label} ↗`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
