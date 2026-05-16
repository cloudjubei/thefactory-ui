import { Modal } from '../../primitives/Modal'

export type SystemPromptViewerModalProps = {
  isOpen: boolean
  onClose: () => void
  /** The effective system prompt for the current chat. */
  prompt: string
  /** Title shown in the modal chrome. Defaults to "Effective system prompt". */
  title?: string
  /** Copy shown when `prompt` is empty. */
  emptyLabel?: string
}

/**
 * Read-only viewer for the effective system prompt. Used by the chat
 * header's "scroll" icon — surfaces what the assistant will see for this
 * chat context. Renderer-agnostic; the host computes the prompt and
 * passes it in.
 */
export default function SystemPromptViewerModal({
  isOpen,
  onClose,
  prompt,
  title = 'Effective system prompt',
  emptyLabel = '(no system prompt configured)',
}: SystemPromptViewerModalProps) {
  if (!isOpen) return null
  return (
    <Modal isOpen onClose={onClose} title={title} size="lg">
      <pre className="text-xs whitespace-pre-wrap break-words text-(--text-primary) max-h-[60vh] overflow-auto">
        {prompt || emptyLabel}
      </pre>
    </Modal>
  )
}
