import { useState, type ReactNode } from 'react'
import { IconDelete, IconRefreshChat } from '../../icons'
import type { MessageDeleteControl } from '../../../headless/utils/chatMessageDeleteTypes'
import type { MessageRestartControl } from '../../../headless/utils/chatMessageRestartTypes'
import { MESSAGE_RESTART_ACTION_LABEL } from '../../../headless/utils/chatMessageRestartConstants'

/** What the delete control on the chat's last row needs from the list. */
export type MessageDeleteBinding = {
  control: MessageDeleteControl
  onDelete: () => void
  /** True while the delete control is hovered and the row is one of the doomed. */
  preview: boolean
  onPreviewChange?: (active: boolean) => void
  /** A delete is still landing — the control spins and refuses a second press. */
  deleting: boolean
}

/** What the restart control on the chat's last row needs from the list. */
export type MessageRestartBinding = {
  control: MessageRestartControl
  onRestart: () => void
}

/**
 * The delete control on the chat's last row. Shown on hover of the nearest
 * `group/msg`, except a locked row, which states itself.
 */
export function MessageDeleteButton({
  binding,
  className = '',
}: {
  binding: MessageDeleteBinding
  className?: string
}) {
  const { control, onDelete, preview, onPreviewChange, deleting } = binding
  const [confirming, setConfirming] = useState(false)
  return (
    <span
      className={
        control.locked
          ? // A locked row states itself: it is not a hover-only nicety,
            // because "this history is deliberately kept" is the message.
            className
          : `${className} transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100 ${
              preview || confirming ? 'opacity-100' : 'opacity-0'
            }`
      }
    >
      {confirming ? (
        // Irreversible, with no undo — so it takes TWO deliberate acts.
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Confirm delete"
            className="h-6 rounded border border-(--color-red-500) bg-(--color-red-500) px-1.5 text-[10px] font-medium text-white"
            onClick={() => {
              setConfirming(false)
              onPreviewChange?.(false)
              onDelete()
            }}
          >
            Delete
          </button>
          <button
            type="button"
            aria-label="Cancel delete"
            className="h-6 rounded px-1 text-[10px] text-(--text-secondary) hover:text-(--text-primary)"
            onClick={() => {
              setConfirming(false)
              onPreviewChange?.(false)
            }}
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          title={control.label}
          aria-label={control.label}
          className="inline-flex items-center justify-center w-6 h-6 rounded border border-(--border-subtle) bg-(--surface-raised) hover:bg-(--surface-hover) text-(--text-primary) disabled:cursor-not-allowed disabled:text-(--text-secondary) disabled:hover:bg-(--surface-raised)"
          onClick={() => setConfirming(true)}
          onMouseEnter={() => onPreviewChange?.(true)}
          onMouseLeave={() => onPreviewChange?.(false)}
          onFocus={() => onPreviewChange?.(true)}
          onBlur={() => onPreviewChange?.(false)}
          disabled={control.disabled || deleting}
        >
          {deleting ? (
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : control.locked ? (
            <span aria-hidden className="text-[11px] leading-none">
              🔒
            </span>
          ) : (
            <IconDelete className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </span>
  )
}

/** The control that runs the agent again on the chat's last turn. */
export function RestartTurnButton({
  binding,
  className = '',
}: {
  binding: MessageRestartBinding
  className?: string
}) {
  const { control, onRestart } = binding
  return (
    <button
      type="button"
      title={control.label}
      aria-label={control.label}
      className={`${className} inline-flex items-center gap-1.5 h-6 px-2 rounded border border-(--border-subtle) bg-(--surface-raised) hover:bg-(--surface-hover) text-[11px] text-(--text-secondary) disabled:cursor-not-allowed disabled:hover:bg-(--surface-raised)`}
      onClick={onRestart}
      disabled={control.disabled}
    >
      <IconRefreshChat className="w-3.5 h-3.5" />
      <span>{MESSAGE_RESTART_ACTION_LABEL}</span>
    </button>
  )
}

/**
 * A chat row drawn as a card of its own — a stop, a failure, background
 * results, an agent's questions, a manager's card — with the controls the
 * conversation's last message carries under it. Every row the person can see
 * goes through here or the plain message layout, so whatever kind of row ends
 * the chat, it can be deleted, and run again where it is the agent's input.
 *
 * Try again leads, always shown; the delete after it appears on hover, as on
 * every row. The delete preview tints the card only: a wash over the controls
 * made them read as disabled.
 */
export function CardRowFrame({
  index,
  rowRef,
  deleteBinding,
  restartBinding,
  children,
}: {
  index: number
  rowRef?: ((el: HTMLDivElement | null) => void) | undefined
  deleteBinding?: MessageDeleteBinding | undefined
  restartBinding?: MessageRestartBinding | undefined
  children: ReactNode
}) {
  const preview = deleteBinding?.preview ?? false
  return (
    <div
      data-msg-idx={index}
      data-delete-preview={preview || undefined}
      ref={rowRef}
      className={`group/msg w-full ${deleteBinding?.deleting ? 'motion-safe:animate-chat-turn-leave' : ''}`}
    >
      <div
        className={
          preview
            ? 'rounded-md bg-(--color-red-500)/8 outline outline-1 outline-(--color-red-500)/50'
            : ''
        }
      >
        {children}
      </div>
      {deleteBinding || restartBinding ? (
        <div className="mt-1.5 flex items-center gap-2">
          {restartBinding ? <RestartTurnButton binding={restartBinding} /> : null}
          {deleteBinding ? <MessageDeleteButton binding={deleteBinding} /> : null}
        </div>
      ) : null}
    </div>
  )
}
