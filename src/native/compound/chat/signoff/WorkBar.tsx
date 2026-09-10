import { ActivityIndicator, Text, View } from 'react-native'

import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type WorkBarProps = {
  /** What is running — "Verifying on a device", "Capturing screens". */
  label: string
}

/**
 * Takes the decision bar's place while an agent is producing evidence. Replaced,
 * not disabled: a greyed-out Approve still reads as a thing you could tap; a
 * bar that has become something else reads as a state you are in.
 */
export default function WorkBar({ label }: WorkBarProps) {
  const { theme, status } = useNativeTheme()
  const working = status.working
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: working.softBorder,
        backgroundColor: working.softBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          height: 20,
          paddingHorizontal: 6,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: working.softBorder,
          backgroundColor: working.softBg,
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: nativeRadii.round,
            borderWidth: 1.5,
            borderColor: working.softFg,
          }}
        />
        <Text style={{ fontSize: 10, color: working.softFg }}>Agent working</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>{label}</Text>
      <ActivityIndicator size="small" color={working.softFg} />
      <Text style={{ flexBasis: '100%', fontSize: 11.5, color: theme.text.secondary }}>
        Keep reading — tabs, evidence and the comparison still work.{' '}
        <Text style={{ fontWeight: '700', color: theme.text.primary }}>
          Sign-off comes back when this finishes.
        </Text>
      </Text>
    </View>
  )
}
