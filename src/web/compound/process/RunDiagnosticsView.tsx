import { useState } from 'react'

import { useRunDiagnostics, type RunDiagnosticsEvent } from '../../../headless'

export type RunDiagnosticsViewProps = {
  /** The run whose flight recorder to show. */
  runId: string
  /**
   * Whether the viewer has Debug mode on. Passed (rather than read here) so the
   * caller owns the gate and the fetch is skipped when off — a run costs nothing
   * to watch until someone opens its diagnostics.
   */
  enabled: boolean
}

/** error → red · warn → amber · info → muted. Maps to the shared status tones. */
const LEVEL_TONE: Record<RunDiagnosticsEvent['level'], string> = {
  error: 'blocked',
  warn: 'on_hold',
  info: 'queued',
}

/**
 * The per-run flight recorder, rendered as a compact timeline: pre-launch
 * checks, the launch summary, each step's outcome, and the reason behind a
 * parked/errored step — the detail a transcript buries. Read-only; it grows live
 * as the run progresses. Shown only when the viewer has Debug mode on.
 */
export default function RunDiagnosticsView({ runId, enabled }: RunDiagnosticsViewProps) {
  if (!enabled) return null
  return <RunDiagnosticsPanel runId={runId} />
}

function RunDiagnosticsPanel({ runId }: { runId: string }) {
  const { diagnostics, isLoaded, loadError } = useRunDiagnostics(runId, { enabled: true })
  const events = diagnostics?.events ?? []
  return (
    <section className="mx-3 mb-4 rounded-md border border-(--border-subtle) bg-(--surface-base)">
      <header className="flex items-center gap-2 border-b border-(--border-subtle) px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          Debug · flight recorder
        </span>
        <span className="text-[10px] text-(--text-muted)">
          {events.length} event{events.length === 1 ? '' : 's'}
          {diagnostics?.truncated ? ' · older trimmed' : ''}
        </span>
      </header>
      {loadError ? (
        <p className="px-3 py-2 text-[11px] text-(--status-blocked-soft-fg)">{loadError.message}</p>
      ) : !isLoaded ? (
        <p className="px-3 py-2 text-[11px] text-(--text-muted)">Loading diagnostics…</p>
      ) : events.length === 0 ? (
        <p className="px-3 py-2 text-[11px] text-(--text-muted)">
          No diagnostics recorded for this run.
        </p>
      ) : (
        <ol className="flex flex-col">
          {events.map((event, i) => (
            <EventRow key={i} event={event} />
          ))}
        </ol>
      )}
    </section>
  )
}

function EventRow({ event }: { event: RunDiagnosticsEvent }) {
  const [open, setOpen] = useState(false)
  const tone = LEVEL_TONE[event.level] ?? 'queued'
  const hasData = event.data !== undefined && Object.keys(event.data).length > 0
  return (
    <li className="border-b border-(--border-subtle) px-3 py-1.5 last:border-b-0">
      <button
        type="button"
        disabled={!hasData}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left disabled:cursor-default"
      >
        <span
          aria-hidden
          className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: `var(--status-${tone}-fg)` }}
        />
        <span className="shrink-0 text-[10px] tabular-nums text-(--text-muted)">
          {new Date(event.at).toLocaleTimeString()}
        </span>
        <span className="shrink-0 rounded-sm bg-(--surface-muted) px-1 text-[9.5px] uppercase tracking-wide text-(--text-muted)">
          {event.phase}
        </span>
        <span className="min-w-0 flex-1 text-[11.5px] text-(--text-primary)">{event.message}</span>
        {hasData ? (
          <span className="shrink-0 text-[10px] text-(--text-muted)">{open ? '−' : '+'}</span>
        ) : null}
      </button>
      {open && hasData ? (
        <pre className="mt-1 ml-[18px] overflow-x-auto rounded bg-(--surface-muted) p-2 text-[10.5px] leading-relaxed text-(--text-secondary)">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      ) : null}
    </li>
  )
}
