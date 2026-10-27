import { Button } from '../../primitives/Button'

export type ProcessGroupRunChatButtonProps = {
  onOpen: () => void
  busy?: boolean
}

/**
 * Native peer of web's `ProcessGroupRunChatButton`: open a chat for the whole
 * group on a group run — the one it reports to, or a new one its updates go to.
 */
export default function ProcessGroupRunChatButton({
  onOpen,
  busy = false,
}: ProcessGroupRunChatButtonProps) {
  return (
    <Button size="sm" variant="secondary" disabled={busy} onPress={onOpen}>
      {busy ? 'Opening chat…' : 'Chat'}
    </Button>
  )
}
