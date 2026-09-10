import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Tooltip from '../../primitives/Tooltip'

export type HelpChipProps = {
  /** Accessible name — what the explanation is about. */
  label: string
  children: ReactNode
}

/** A `?` that explains where something came from. Never how to use the screen. */
export default function HelpChip({ label, children }: HelpChipProps) {
  const { theme } = useNativeTheme()
  return (
    <Tooltip content={<View style={{ maxWidth: 280, gap: 4 }}>{children}</View>} placement="top">
      <View
        accessibilityLabel={label}
        style={{
          width: 16,
          height: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.border.default,
        }}
      >
        <Text style={{ fontSize: 10, lineHeight: 12, fontWeight: '600', color: theme.text.muted }}>
          ?
        </Text>
      </View>
    </Tooltip>
  )
}
