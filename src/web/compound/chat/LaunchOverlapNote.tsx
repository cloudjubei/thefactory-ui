import type { LaunchOverlapView } from '../../../headless/utils/launchOverlapTypes'

export type LaunchOverlapNoteProps = {
  /** What other work touches the files the features name, from the launch preview. */
  view: LaunchOverlapView
}

/**
 * Other work touches the files this launch's features name — a live run, or
 * the base branch's new commits. A warning beside the launch, never a block.
 * Native peer: `native/compound/chat/LaunchOverlapNote`.
 */
export default function LaunchOverlapNote({ view }: LaunchOverlapNoteProps) {
  return (
    <div
      role="note"
      aria-label={view.heading}
      className="flex flex-col gap-1 rounded-lg border border-(--status-review-soft-border) bg-(--status-review-soft-bg) px-3 py-2"
    >
      <span className="text-[12.5px] font-semibold text-(--text-primary)">{view.heading}</span>
      {view.lines.map((line) => (
        <span key={line} className="text-[11.5px] text-(--status-review-soft-fg)">
          {line}
        </span>
      ))}
    </div>
  )
}
