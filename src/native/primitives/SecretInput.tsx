import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Input, type InputProps } from './Input'
import { IconEye, IconEyeOff } from '../icons'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export interface SecretInputProps extends Omit<InputProps, 'secureTextEntry'> {}

/**
 * Native peer of web's `SecretInput` — a masked text field with a reveal
 * toggle. The toggle is overlaid ON the input's trailing edge (matches web's
 * absolute-positioned eye icon), not rendered as a separate sibling control.
 * Uses the shared `IconEye` / `IconEyeOff` icons so the look matches the web
 * implementation 1:1.
 */
export function SecretInput({ style, ...rest }: SecretInputProps) {
  const [revealed, setRevealed] = useState(false)
  return (
    <View style={{ position: 'relative', width: '100%' }}>
      <Input
        {...rest}
        secureTextEntry={!revealed}
        autoCapitalize="none"
        autoCorrect={false}
        // Reserve room on the right for the eye button so caret + text never
        // collide with the icon. The eye is at `right: nativeSpace[2]` (4px)
        // with `width: 32`, so it sits in the rightmost 36px — give the
        // text a 44px right padding to clear it with breathing room.
        style={[{ paddingRight: 44 }, style]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Hide value' : 'Reveal value'}
        onPress={() => setRevealed((v) => !v)}
        hitSlop={6}
        style={({ pressed }) => ({
          position: 'absolute',
          right: nativeSpace[2],
          top: 0,
          bottom: 0,
          width: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[1],
          backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
        })}
      >
        {revealed ? (
          <IconEyeOff size={18} color={nativeLightTheme.text.muted} />
        ) : (
          <IconEye size={18} color={nativeLightTheme.text.muted} />
        )}
      </Pressable>
    </View>
  )
}
