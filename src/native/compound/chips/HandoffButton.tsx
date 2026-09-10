import type { ReactNode } from 'react'
import { Text } from 'react-native'

import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconAgent } from '../../icons'
import { Button } from '../../primitives/Button'

export type HandoffButtonProps = {
  /** The request, without the trailing ellipsis — "Ask the agent to fix this". */
  children: ReactNode
  onPress: () => void
  disabled?: boolean
}

/**
 * The control that hands work to an AGENT. Quieter than the run button, never
 * accent-filled, and it ends in an ellipsis because it opens a confirm rather
 * than acting — approving it spends a run, and the price is shown on the face
 * so the confirm never carries a surprise.
 */
export default function HandoffButton({ children, onPress, disabled }: HandoffButtonProps) {
  const { theme } = useNativeTheme()
  return (
    <Button variant="handoff" size="sm" onPress={onPress} disabled={disabled}>
      <IconAgent size={12} color={theme.text.secondary} />
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {children}
        {'…'}
      </Text>
      <Text style={{ fontSize: 13, color: theme.text.muted }}>· 1 run</Text>
    </Button>
  )
}
