import { Text, View } from 'react-native'

import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/**
 * Native peer of [web's `ChainChip`](../../../web/compound/process/ChainChip.tsx).
 * One step in a process step-chain — an agent step (the one place a model runs,
 * and spends) carries a filled purple dot; a function step a hollow grey one.
 * Shared by the launch dock and the Processes catalogue so the chain is drawn
 * one way.
 */
export type ChainChipItem = { name: string; agent: boolean }

export default function ChainChip({ chip }: { chip: ChainChipItem }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: nativeRadii[4],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.base,
        paddingHorizontal: 8,
        paddingVertical: 1,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: chip.agent ? '#A25DDC' : 'transparent',
          borderWidth: chip.agent ? 0 : 1.5,
          borderColor: theme.text.muted,
        }}
      />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{chip.name}</Text>
    </View>
  )
}
