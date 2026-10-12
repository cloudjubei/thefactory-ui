import { useState } from 'react'
import {
  PROCESS_MANAGER_DISCUSS_LABEL,
  PROCESS_MANAGER_FOUND_LABEL,
  PROCESS_MANAGER_NEEDS_YOU_TITLE,
  PROCESS_MANAGER_OPEN_CHAT_LABEL,
  PROCESS_MANAGER_PRE_READ_TITLE,
  PROCESS_MANAGER_RECOMMENDS_LABEL,
  PROCESS_MANAGER_TRIED_LABEL,
  PROCESS_MANAGER_WHY_LABEL,
  type ProcessRunManagerView,
} from '../../../headless'
import { Button } from '../../primitives/Button'

export type RunManagerPanelProps = {
  view: ProcessRunManagerView
  /** Open the run's chat, where the manager works and the person can carry on. */
  onOpenChat?: () => void
}

/**
 * What the run's agent manager is doing and has done: a line while it looks
 * at or holds the park, or waits on a card it raised (with the way to it), its
 * card when it handed the park to you, its pre-read
 * of the sign-off, and "Handled for you" — every intervention, what, why and
 * how it came out.
 */
export default function RunManagerPanel({ view, onOpenChat }: RunManagerPanelProps) {
  const [open, setOpen] = useState(false)
  const { status, escalation, preRead, handled } = view
  if (!status && !preRead && handled.lines.length === 0) return null
  return (
    <div className="mx-3 mt-3 flex flex-col gap-2">
      {status && status.state !== 'escalated' ? (
        <div
          role="status"
          className="flex flex-col gap-1.5 rounded-md px-2.5 py-2 text-[12px]"
          style={
            status.state === 'waiting'
              ? {
                  background: 'var(--status-on_hold-soft-bg)',
                  border: '1px solid var(--status-on_hold-soft-border)',
                  color: 'var(--status-on_hold-soft-fg)',
                }
              : {
                  background: 'var(--status-working-soft-bg)',
                  border: '1px solid var(--status-working-soft-border)',
                  color: 'var(--status-working-soft-fg)',
                }
          }
        >
          {status.text}
          {status.state === 'waiting' && onOpenChat ? (
            <Button size="sm" variant="secondary" className="self-start" onClick={onOpenChat}>
              {PROCESS_MANAGER_OPEN_CHAT_LABEL}
            </Button>
          ) : null}
        </div>
      ) : null}
      {escalation ? (
        <div
          className="flex flex-col gap-1.5 rounded-lg p-3 text-[12px]"
          style={{
            background: 'var(--status-on_hold-soft-bg)',
            border: '1px solid var(--status-on_hold-soft-border)',
          }}
        >
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--status-on_hold-soft-fg)' }}
          >
            {PROCESS_MANAGER_NEEDS_YOU_TITLE} — {escalation.reason}
          </span>
          {escalation.what.map((line) => (
            <span key={line} className="text-(--text-secondary)">
              {line}
            </span>
          ))}
          <span>
            <strong>{PROCESS_MANAGER_FOUND_LABEL}: </strong>
            {escalation.found}
          </span>
          {escalation.tried.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <strong>{PROCESS_MANAGER_TRIED_LABEL}</strong>
              {escalation.tried.map((t) => (
                <span key={t} className="text-(--text-secondary)">
                  • {t}
                </span>
              ))}
            </div>
          ) : null}
          <span>
            <strong>{PROCESS_MANAGER_RECOMMENDS_LABEL}: </strong>
            {escalation.recommendation}
            {escalation.recommendedChoice ? ` (${escalation.recommendedChoice})` : ''}
          </span>
          {onOpenChat ? (
            <Button size="sm" variant="secondary" className="self-start" onClick={onOpenChat}>
              {PROCESS_MANAGER_DISCUSS_LABEL}
            </Button>
          ) : null}
        </div>
      ) : null}
      {preRead ? (
        <div className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2 text-[12px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {PROCESS_MANAGER_PRE_READ_TITLE}
          </span>
          <p className="leading-relaxed text-(--text-secondary)">{preRead.summary}</p>
          {preRead.items.map((item) => (
            <div key={item.itemId} className="flex flex-col">
              <span>{item.finding}</span>
              <span className="text-(--text-secondary)">
                {PROCESS_MANAGER_RECOMMENDS_LABEL}: {item.recommendation}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {handled.lines.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="self-start text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)"
          >
            {handled.title} {open ? '▾' : '▸'}
          </button>
          {open
            ? handled.lines.map((line) => (
                <div key={line.key} className="flex flex-col text-[12px]">
                  <span className="text-(--text-primary)">{line.what}</span>
                  <span className="text-(--text-secondary)">
                    {PROCESS_MANAGER_WHY_LABEL} {line.why} →{' '}
                    <span style={{ color: `var(--status-${line.tone}-fg)` }}>{line.result}</span>
                  </span>
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  )
}
