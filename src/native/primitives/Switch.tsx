import { Switch as RNSwitch, Text, View } from 'react-native'
import { nativeLightTheme, nativeSpace } from '../../tokens/native'

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
          false: nativeLightTheme.border.default,
          true: nativeLightTheme.accent.primary,
        }}
        thumbColor="#ffffff"
        ios_backgroundColor={nativeLightTheme.border.default}
      />
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: disabled ? nativeLightTheme.text.muted : nativeLightTheme.text.primary,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  )
}
