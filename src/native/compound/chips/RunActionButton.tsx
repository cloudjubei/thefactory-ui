import type { ReactNode } from 'react'
import { Text } from 'react-native'

import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconPlay } from '../../icons'
import { Button } from '../../primitives/Button'

export type RunActionButtonProps = {
  children: ReactNode
  onPress: () => void
  /** True while the run is in flight — the button turns inert with a spinner. */
  busy?: boolean
  busyLabel?: string
  disabled?: boolean
}

/**
 * The control that starts IMMEDIATE work on a review surface — a configured
 * command, no agent, no cost. It is the only accent-toned control in a check
 * block, so the eye finds the free action first.
 */
export default function RunActionButton({
  children,
  onPress,
  busy = false,
  busyLabel,
  disabled,
}: RunActionButtonProps) {
  const { theme } = useNativeTheme()
  return (
    <Button variant="run" size="sm" onPress={onPress} loading={busy} disabled={disabled}>
      {busy ? (
        (busyLabel ?? 'Running…')
      ) : (
        <>
          <IconPlay size={12} color={theme.accent.primary} />
          <Text style={{ fontSize: 13, color: theme.accent.primary }}>{children}</Text>
        </>
      )}
    </Button>
  )
}
