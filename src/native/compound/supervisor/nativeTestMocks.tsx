import type { ReactNode } from 'react'

type Pressed = {
  children?: ReactNode
  onPress?: () => void
  accessibilityLabel?: string
  disabled?: boolean
  accessibilityState?: { expanded?: boolean }
}

/** The react-native parts the supervisor and queue panels use, as DOM, for their tests. */
export const reactNativeMock = {
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
    <span onClick={onPress}>{children}</span>
  ),
  Pressable: ({ children, onPress, accessibilityLabel, disabled, accessibilityState }: Pressed) => (
    <button
      aria-label={accessibilityLabel}
      aria-expanded={accessibilityState?.expanded}
      onClick={(event) => {
        event.stopPropagation()
        onPress?.()
      }}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Switch: ({
    value,
    onValueChange,
    accessibilityLabel,
  }: {
    value: boolean
    onValueChange: (next: boolean) => void
    accessibilityLabel?: string
  }) => (
    <button
      role="switch"
      aria-checked={value}
      aria-label={accessibilityLabel}
      onClick={() => onValueChange(!value)}
    />
  ),
}
