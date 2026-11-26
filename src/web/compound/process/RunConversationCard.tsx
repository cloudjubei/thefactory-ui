import { RUN_CONVERSATION_COPY as COPY, type RunConversationView } from '../../../headless'
import Spinner from '../../primitives/Spinner'

export type RunConversationCardProps = {
  view: RunConversationView
  /** Open the run's chat, where the conversation is; without it the card only says where it stands. */
  onOpen?: (() => void) | undefined
  className?: string
}

/**
 * The conversation of a run that works in its own chat, as a row on the
 * run's page while it is due: its step working, or an ask waiting for the
 * person's answer — tinted as a decision then. The row opens the chat, where
 * the ask is answered on its own card.
 */
export default function RunConversationCard({
  view,
  onOpen,
  className = 'mx-3 mt-3',
}: RunConversationCardProps) {
  const tone = view.state === 'asks' ? 'review' : 'running'
  const label = COPY.label(view.title, view.line)
  const body = (
    <>
      {view.state === 'working' ? (
        <Spinner size={12} />
      ) : (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: `var(--status-${tone}-bg)` }}
        />
      )}
      <span className="min-w-0 truncate">
        <span className="font-semibold text-(--text-primary)">{view.title}</span>
        <span className="text-(--text-muted)"> · </span>
        <span
          className={
            view.state === 'asks' ? 'font-medium text-(--text-primary)' : 'text-(--text-secondary)'
          }
        >
          {view.line}
        </span>
      </span>
      {onOpen ? (
        <span className="ml-auto shrink-0 font-medium text-(--accent-primary)">
          {view.state === 'asks' ? COPY.answer : COPY.open} ›
        </span>
      ) : null}
    </>
  )
  const frame = `${className} flex min-w-0 items-center gap-2 rounded-xl px-4 py-3 text-left text-[13px] sm:px-5`
  const style = {
    background: `var(--status-${tone}-soft-bg)`,
    border: `1px solid var(--status-${tone}-soft-border)`,
  }
  return onOpen ? (
    <button
      type="button"
      aria-label={label}
      className={`${frame} hover:brightness-95`}
      style={style}
      onClick={onOpen}
    >
      {body}
    </button>
  ) : (
    <div role="status" aria-label={label} className={frame} style={style}>
      {body}
    </div>
  )
}
