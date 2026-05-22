import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Input, type InputProps } from './Input'
import { nativeLightTheme, nativeSpace } from '../../tokens/native'

export interface SecretInputProps extends Omit<InputProps, 'secureTextEntry'> {}

/**
 * Native peer of web's `SecretInput` — a masked text field with a reveal
 * toggle. Mirrors the API-key / token entry pattern used across Settings.
 */
export function SecretInput(props: SecretInputProps) {
  const [revealed, setRevealed] = useState(false)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      <View style={{ flex: 1 }}>
        <Input
          {...props}
          secureTextEntry={!revealed}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Hide value' : 'Reveal value'}
        onPress={() => setRevealed((v) => !v)}
        hitSlop={6}
        style={({ pressed }) => ({
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderRadius: 6,
          backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
        })}
      >
        <Text style={{ fontSize: 16 }}>{revealed ? '🙈' : '👁'}</Text>
      </Pressable>
    </View>
  )
}
