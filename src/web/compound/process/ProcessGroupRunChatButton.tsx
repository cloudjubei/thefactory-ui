import { IconChat } from '../../icons'
import { Button } from '../../primitives/Button'

export type ProcessGroupRunChatButtonProps = {
  onOpen: () => void
  busy?: boolean
}

/**
 * Open a chat for the whole group on a group run — the one it reports to, or,
 * for a run started from a group story, a new one its updates go to from then on.
 */
export default function ProcessGroupRunChatButton({
  onOpen,
  busy = false,
}: ProcessGroupRunChatButtonProps) {
  return (
    <Button size="sm" variant="secondary" loading={busy} onClick={onOpen}>
      <IconChat className="size-3.5" />
      Chat
    </Button>
  )
}
