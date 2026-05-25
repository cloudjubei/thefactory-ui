import { Switch as RNSwitch, Text, View } from 'react-native'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: SwitchProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      className={className}
      style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}
    >
      <RNSwitch
        value={checked}
        disabled={disabled}
        onValueChange={onCheckedChange}
        trackColor={{
          false: theme.border.default,
          true: theme.accent.primary,
        }}
        thumbColor="#ffffff"
        ios_backgroundColor={theme.border.default}
      />
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: disabled ? theme.text.muted : theme.text.primary,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  )
}
