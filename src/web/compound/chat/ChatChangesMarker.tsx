import type { ChatChangesMarkerView } from '../../../headless/utils/chatChangesDockTypes'
import { IconFile } from '../../icons'
import { RefChip } from '../chips'
import { AlreadyOnBaseLine } from './AlreadyOnBaseLine'
import { TONE_CHIP } from './signoff'

export type ChatChangesMarkerProps = {
  view: ChatChangesMarkerView
  /** Opens the turn's review. Without it the marker only says what changed. */
  onOpen?: () => void
}

/**
 * The one line a chat turn leaves where it changed files: how many, the branch
 * they wait on, and the link that opens their review. The decision itself is
 * never here — it waits in the bar above the message box. Changes settled
 * elsewhere read as their one-line notice instead, and a change its base
 * already holds as one neutral line.
 */
export function ChatChangesMarker({ view, onOpen }: ChatChangesMarkerProps) {
  if (view.kind === 'already') {
    return <AlreadyOnBaseLine text={view.text} {...(view.change ? { change: view.change } : {})} />
  }
  if (view.kind === 'notice') {
    return (
      <div className="mt-2 max-w-2xl rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2 text-[12px] text-(--text-secondary)">
        {view.text}
      </div>
    )
  }
  return (
    <div className="mt-2 flex max-w-2xl flex-col gap-1 rounded-lg border border-dashed border-(--border-strong) px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-(--text-primary)">
        <IconFile className="h-4 w-4 shrink-0 text-(--text-secondary)" />
        <span>{view.label}</span>
        {view.branch ? <RefChip kind="branch" value={view.branch} /> : null}
        {view.status ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[view.status.tone]}`}
          >
            {view.status.label}
          </span>
        ) : null}
        {view.action && onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="ml-auto shrink-0 text-[13px] text-(--accent-primary) hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
          >
            {view.action.label}
          </button>
        ) : null}
      </div>
      {view.note ? (
        <span className="pl-6.5 text-[12px] text-(--text-secondary)">{view.note}</span>
      ) : null}
    </div>
  )
}
