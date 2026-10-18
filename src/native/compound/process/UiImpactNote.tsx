import { Text, View } from 'react-native'

import type { UiImpactNote as UiImpactNoteView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconEye, IconEyeOff } from '../../icons'

export type UiImpactNoteProps = {
  note: UiImpactNoteView
}

/**
 * How an attempt judged whether its change alters what users see, or a code
 * review's view of it. The native peer of the web `UiImpactNote`.
 */
export default function UiImpactNote({ note }: UiImpactNoteProps) {
  const { theme } = useNativeTheme()
  const Icon = note.tone === 'shows' ? IconEye : IconEyeOff
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: nativeSpace[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <View style={{ marginTop: 2 }}>
        <Icon size={14} color={theme.text.secondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 12, color: theme.text.primary }}>
          <Text style={{ fontWeight: '600' }}>{note.label}</Text>
          {note.by ? <Text style={{ color: theme.text.secondary }}> · {note.by}</Text> : null}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{note.reason}</Text>
      </View>
    </View>
  )
}
