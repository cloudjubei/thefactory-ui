import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { nativeLightTheme, nativeSpace } from '../../tokens/native'

export interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}

/**
 * Vertical stack: label → input → optional hint. The web peer relies on
 * `<label>` to wire screen readers implicitly; RN has no equivalent, so
 * the calling code should set `accessibilityLabel` on the child input if it
 * isn't already accessible by content.
 */
export default function Field({ label, hint, children }: FieldProps) {
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: nativeLightTheme.text.primary }}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted, opacity: 0.85 }}>
          {hint}
        </Text>
      )}
    </View>
  )
}
