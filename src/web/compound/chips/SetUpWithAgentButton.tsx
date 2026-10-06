import { CAPABILITY_SETUP_LABEL } from '../../../headless'
import { Button } from '../../primitives/Button'
import { IconChat } from '../../icons'

export type SetUpWithAgentButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/** Opens a chat with a draft asking the agent to set a missing capability up — the person sends it. */
export default function SetUpWithAgentButton({ onClick, disabled }: SetUpWithAgentButtonProps) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled}>
      <IconChat className="w-3.5 h-3.5" />
      <span>{CAPABILITY_SETUP_LABEL}</span>
    </Button>
  )
}
