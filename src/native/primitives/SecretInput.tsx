import { Pressable, Text, View } from 'react-native'
import { Input, type InputProps } from './Input'
import { ConfirmDialog } from './Modal'
import { IconEye, IconEyeOff } from '../icons'
import { nativeFontSizes, nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { useSecretReveal } from '../../headless/hooks/useSecretReveal'
import { SECRET_REVEAL_FAILED_TEXT } from '../../headless/utils/secretRevealConstants'

export interface SecretInputProps extends Omit<InputProps, 'secureTextEntry'> {
  revealConfirmTitle?: string
  revealConfirmDescription?: string
  /**
   * Fetches the stored secret the field does not hold — given only when one is
   * stored. The eye then shows it, once the person confirmed, without changing
   * the field's value: left as it is, the stored secret is kept.
   */
  onReveal?: () => Promise<string>
}

/**
 * Native peer of web's `SecretInput` — a masked text field with a reveal
 * toggle. The toggle is overlaid ON the input's trailing edge (matches web's
 * absolute-positioned eye icon), not rendered as a separate sibling control.
 * Uses the shared `IconEye` / `IconEyeOff` icons so the look matches the web
 * implementation 1:1.
 */
export function SecretInput({
  style,
  revealConfirmTitle = 'Reveal secret?',
  revealConfirmDescription = 'The value will be visible on screen until you leave this screen.',
  onReveal,
  value,
  onChangeText,
  ...rest
}: SecretInputProps) {
  const { theme, status } = useNativeTheme()
  const reveal = useSecretReveal({
    typed: value ?? '',
    ...(onReveal ? { onReveal } : {}),
    confirmTyped: false,
  })
  const revealed = !reveal.shown.masked
  return (
    <View style={{ width: '100%' }}>
      <View style={{ position: 'relative', width: '100%' }}>
        <Input
          {...rest}
          value={reveal.shown.value}
          onChangeText={(text) => {
            reveal.typed()
            onChangeText?.(text)
          }}
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
          onPress={reveal.toggle}
          disabled={reveal.fetching}
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
            backgroundColor: pressed ? theme.surface.muted : 'transparent',
          })}
        >
          {revealed ? (
            <IconEyeOff size={18} color={theme.text.muted} />
          ) : (
            <IconEye size={18} color={theme.text.muted} />
          )}
        </Pressable>
      </View>
      {reveal.failed ? (
        <Text
          accessibilityRole="alert"
          style={{
            marginTop: nativeSpace[1],
            fontSize: nativeFontSizes.xs,
            color: status.stuck.softFg,
          }}
        >
          {SECRET_REVEAL_FAILED_TEXT}
        </Text>
      ) : null}
      <ConfirmDialog
        isOpen={reveal.confirming}
        onClose={reveal.cancel}
        onConfirm={reveal.confirm}
        title={revealConfirmTitle}
        description={revealConfirmDescription}
        confirmLabel="Reveal"
      />
    </View>
  )
}
