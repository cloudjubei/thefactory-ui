import { Switch as RNSwitch, Text, View } from 'react-native'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  /** Stable handle for UI-test tooling (Android resource-id / iOS accessibilityIdentifier). */
  testID?: string
  accessibilityLabel?: string
  className?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  testID,
  accessibilityLabel,
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
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
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
