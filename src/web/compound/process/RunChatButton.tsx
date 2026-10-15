import { RUN_CHAT_OPEN_LABEL } from '../../../headless'
import { IconChat } from '../../icons'

export type RunChatButtonProps = {
  onOpen: () => void
  /** The run's chat has news for the person — a reply or an ask they have not seen. */
  unread: boolean
  /** Sized to a panel head's smaller buttons. */
  compact?: boolean
}

/**
 * The run chat's button, on every page of a run: the run header at any depth
 * and a step's panel. It opens the one chat of the whole run tree.
 */
export default function RunChatButton({ onOpen, unread, compact = false }: RunChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={RUN_CHAT_OPEN_LABEL}
      title={RUN_CHAT_OPEN_LABEL}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md border bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover) ${
        compact ? 'size-7.5 border-(--border-subtle)' : 'size-8 border-(--border-default)'
      }`}
    >
      <IconChat className={compact ? 'size-3.5' : 'size-4'} />
      {unread ? (
        <span
          aria-hidden
          className="absolute right-1 top-1 size-2 rounded-full bg-(--accent-primary)"
        />
      ) : null}
    </button>
  )
}
