import { Text } from 'react-native'

import { CAPABILITY_SETUP_LABEL } from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChat } from '../../icons'
import { Button } from '../../primitives/Button'

export type SetUpWithAgentButtonProps = {
  onPress: () => void
  disabled?: boolean
}

/** Opens a chat with a draft asking the agent to set a missing capability up — the person sends it. */
export default function SetUpWithAgentButton({ onPress, disabled }: SetUpWithAgentButtonProps) {
  const { theme } = useNativeTheme()
  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={CAPABILITY_SETUP_LABEL}
    >
      <IconChat size={14} color={theme.text.secondary} />
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>{CAPABILITY_SETUP_LABEL}</Text>
    </Button>
  )
}
