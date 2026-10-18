import { Text, View } from 'react-native'

import type { ScreensDecisionNote as ScreensDecisionNoteView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconEye, IconEyeOff } from '../../icons'

export type ScreensDecisionNoteProps = {
  note: ScreensDecisionNoteView
}

/**
 * Whether the story's change must be shown on screen, on its sign-off, and
 * what decided it. The native peer of the web `ScreensDecisionNote`.
 */
export default function ScreensDecisionNote({ note }: ScreensDecisionNoteProps) {
  const { theme } = useNativeTheme()
  const Icon = note.tone === 'not-needed' ? IconEyeOff : IconEye
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: nativeSpace[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
      }}
    >
      <View style={{ marginTop: 2 }}>
        <Icon size={14} color={theme.text.secondary} />
      </View>
      <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.secondary }}>
        <Text style={{ fontWeight: '600', color: theme.text.primary }}>{note.label}</Text>
        {` — ${note.reason}`}
      </Text>
    </View>
  )
}
