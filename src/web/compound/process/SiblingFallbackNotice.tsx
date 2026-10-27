import {
  SIBLING_FALLBACK_PENDING_LABEL,
  useSiblingFallbackNotice,
  type SiblingFallbackView,
} from '../../../headless'

export type SiblingFallbackNoticeProps = {
  view: SiblingFallbackView
  /** Set once a newer checks attempt ran: the notice is history, said so in one line. */
  superseded?: string
  /** Leave out the host's sentence where the surrounding line already says it. */
  hideMessage?: boolean
}

/**
 * Checks that ran again with out-of-tree code at its stable branch: what that
 * came to, each dependency's working tree against the stable commit used, and
 * what failed — on a checks step, a merge's result and the run's chat alike.
 */
export default function SiblingFallbackNotice({
  view,
  superseded,
  hideMessage = false,
}: SiblingFallbackNoticeProps) {
  const tone = superseded ? 'empty' : view.tone
  return (
    <div
      role="note"
      aria-label={view.title}
      className="flex min-w-0 flex-col gap-1.5 rounded-md border px-2.5 py-2 text-[12.5px]"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        borderColor: `var(--status-${tone}-soft-border)`,
      }}
    >
      <span className="font-semibold" style={{ color: `var(--status-${tone}-soft-fg)` }}>
        {view.title}
      </span>
      {superseded ? <span className="text-(--text-secondary)">{superseded}</span> : null}
      {hideMessage ? null : (
        <p className="m-0 min-w-0 break-words text-(--text-primary)">{view.message}</p>
      )}
      {view.chips.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {view.chips.map((chip) => (
            <li
              key={chip.path}
              title={chip.path}
              className="flex max-w-full flex-wrap items-baseline gap-x-1 rounded-[10px] border border-(--border-strong) px-2 text-[11px] text-(--text-secondary) [&>span]:whitespace-nowrap"
            >
              <span className="font-medium text-(--text-primary)">{chip.name}</span>
              <span className="tabular-nums">{chip.live}</span>
              {chip.pending ? <span>· {SIBLING_FALLBACK_PENDING_LABEL}</span> : null}
              <span className="tabular-nums">
                <span aria-hidden>→ </span>
                {chip.stable}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {view.failures ? (
        <details className="min-w-0">
          <summary className="cursor-pointer text-[12px] text-(--text-secondary)">
            {view.failures.label} ({view.failures.lines.length})
          </summary>
          <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0 font-mono text-[11.5px] text-(--text-primary)">
            {view.failures.lines.map((line) => (
              <li key={line} className="break-words">
                {line}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {view.notReplaced.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[12px] text-(--text-secondary)">
          {view.notReplaced.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * A run-chat notice about a checks attempt, read live off the run: the notice
 * while that attempt is the run's newest, marked as history once a newer one
 * ran; nothing while the run is not read.
 */
export function RunSiblingFallbackNotice({ runId, entryId }: { runId: string; entryId: string }) {
  const notice = useSiblingFallbackNotice(runId, entryId)
  if (notice.state === 'unknown') return null
  return (
    <SiblingFallbackNotice
      view={notice.view}
      {...(notice.state === 'superseded' ? { superseded: notice.line } : {})}
    />
  )
}
