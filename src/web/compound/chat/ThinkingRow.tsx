import { memo, useState } from 'react'
import Spinner from '../../primitives/Spinner'
import Markdown from '../Markdown'
import { IconChevron, IconHourglass } from '../../icons'

export type ThinkingRowProps = {
  thinking?: string
  defaultOpen?: boolean
  label?: string
  /** Optional text shown beside the spinner in the no-reasoning state — used for
   * a transient status (e.g. "Starting the agent…" while a CLI sandbox boots). */
  spinnerLabel?: string
  /** Optional secondary line under {@link spinnerLabel} (e.g. a reassuring note
   * that the first CLI turn is the slow one while the sandbox warms up). */
  spinnerSubLabel?: string
  /**
   * `'blocked'` swaps the spinner for the teal hourglass the tool cards already
   * use for `require_confirmation` — a run parked on a human decision must not
   * animate as though it were working.
   */
  tone?: 'working' | 'blocked'
}

function ThinkingRow({
  thinking,
  defaultOpen = false,
  label = 'Reasoning',
  spinnerLabel,
  spinnerSubLabel,
  tone = 'working',
}: ThinkingRowProps) {
  const [open, setOpen] = useState(defaultOpen)
  const reasoning = thinking?.trim()

  return (
    <div className="flex items-start gap-2 flex-row">
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border border-(--border-subtle) text-(--text-primary)"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' }}
        aria-hidden
      >
        AI
      </div>
      <div className="max-w-[72%] min-w-[80px] flex flex-col items-start gap-1">
        {reasoning ? (
          <div className="w-full overflow-hidden rounded-2xl rounded-bl-md border border-(--border-subtle) bg-(--surface-raised) shadow">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-(--text-secondary) hover:bg-(--surface-overlay)"
              aria-expanded={open}
            >
              <span className="font-medium">{label}</span>
              <IconChevron
                className="w-4 h-4 transition-transform"
                style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
              />
            </button>
            {open ? (
              <div className="border-t border-(--border-subtle) px-3 py-2 text-xs whitespace-pre-wrap wrap-break-word text-(--text-secondary)">
                <Markdown text={reasoning} />
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={`overflow-x-auto max-w-full px-3 py-2 rounded-2xl rounded-bl-md whitespace-pre-wrap wrap-break-word shadow bg-(--surface-raised) text-(--text-primary) border ${
              tone === 'blocked' ? 'border-teal-500/60' : 'border-(--border-subtle)'
            }`}
          >
            <span className="inline-flex items-center gap-2.5">
              {tone === 'blocked' ? (
                <IconHourglass className="w-4 h-4 text-teal-500" />
              ) : (
                <Spinner />
              )}
              {spinnerLabel || spinnerSubLabel ? (
                <span className="flex flex-col leading-tight">
                  {spinnerLabel ? (
                    <span className="text-xs text-(--text-secondary)">{spinnerLabel}</span>
                  ) : null}
                  {spinnerSubLabel ? (
                    <span className="text-[11px] text-(--text-muted)">{spinnerSubLabel}</span>
                  ) : null}
                </span>
              ) : null}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(ThinkingRow)
