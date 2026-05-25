import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface FieldProps {
  label: ReactNode
  /** Optional content rendered to the right of the label (e.g. a "+ Add"
   *  affordance for a list-shaped input). */
  labelTrailing?: ReactNode
  hint?: ReactNode
  children: ReactNode
}

// RN has no `<label>` equivalent — set `accessibilityLabel` on the child
// input if it isn't already accessible by content.
//
// Label typography mirrors web's `<label>` in `Field.tsx`: a `text-sm
// font-medium` heading (14px / 500) above the input. The hint sits underneath
// at `text-xs`, dimmed.
export default function Field({ label, labelTrailing, hint, children }: FieldProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {label}
        </Text>
        {labelTrailing}
      </View>
      {children}
      {hint && (
        <Text style={{ fontSize: 12, color: theme.text.muted, opacity: 0.85 }}>
          {hint}
        </Text>
      )}
    </View>
  )
}
