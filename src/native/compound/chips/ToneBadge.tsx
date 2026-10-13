import { Text, View } from 'react-native'

import type { ProcessStatusTone } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ToneBadgeProps {
  tone: ProcessStatusTone
  label: string
}

/** Native peer of web's `ToneBadge`: a soft status pill in the semantic palette. */
export default function ToneBadge({ tone, label }: ToneBadgeProps) {
  const { status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      style={{
        backgroundColor: variant.softBg,
        borderColor: variant.softBorder,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: 11, color: variant.softFg }}>
        {label}
      </Text>
    </View>
  )
}
