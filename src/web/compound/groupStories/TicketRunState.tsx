import type { ReactNode } from 'react'

import { TICKET_RUN_TEXT, type TicketRunOpen, type TicketRunState } from '../../../headless'
import { Button } from '../../primitives/Button'

type Opens = {
  run: TicketRunState
  /** Open the run; without it the run is only said. */
  onOpen?: ((open: TicketRunOpen) => void) | undefined
}

const stop =
  (go: () => void) =>
  (e: { stopPropagation: () => void }): void => {
    e.stopPropagation()
    go()
  }

/** The run's dot in its badge's tone, beating while it works — as the Processes list dots a run. */
export function TicketRunDot({ run }: { run: TicketRunState }) {
  return (
    <span
      aria-hidden
      className={`size-1.5 shrink-0 rounded-full ${run.live ? 'animate-pulse' : ''}`}
      style={{
        background: `var(--status-${run.tone}-bg)`,
        boxShadow: `0 0 0 1px var(--status-${run.tone}-soft-border)`,
      }}
    />
  )
}

function Words({ run }: { run: TicketRunState }) {
  return (
    <span className="min-w-0">
      <span className="font-medium text-(--text-primary)">{run.name}</span>
      <span className="text-(--text-muted)"> · </span>
      <span className={run.asks ? 'font-medium text-(--text-primary)' : 'text-(--text-secondary)'}>
        {run.state}
      </span>
    </span>
  )
}

/** The run working a ticket, in a line under its row, tinted while it waits on the person, with Open run. */
export function TicketRunLine({ run, onOpen }: Opens) {
  return (
    <div
      title={run.hint}
      className="flex min-w-0 basis-full items-center gap-2 rounded-md px-2 py-1 text-[12px]"
      style={
        run.asks
          ? {
              background: `var(--status-${run.tone}-soft-bg)`,
              border: `1px solid var(--status-${run.tone}-soft-border)`,
            }
          : { background: 'var(--surface-sunken)' }
      }
    >
      <TicketRunDot run={run} />
      <Words run={run} />
      {onOpen ? (
        <button
          type="button"
          className="ml-auto shrink-0 text-(--accent-primary) hover:underline"
          title={TICKET_RUN_TEXT.openRunHint(run.label)}
          onClick={stop(() => onOpen(run.open))}
        >
          {TICKET_RUN_TEXT.openRun} ›
        </button>
      ) : null}
    </div>
  )
}

/** The run working a ticket, as a chip among its row's chips; pressing it opens the run. */
export function TicketRunChip({ run, onOpen }: Opens) {
  const body = (
    <>
      <TicketRunDot run={run} />
      <span className="min-w-0 truncate">{run.label}</span>
    </>
  )
  const className =
    'inline-flex min-w-0 max-w-[340px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-px text-[11px]'
  const style = {
    background: `var(--status-${run.tone}-soft-bg)`,
    color: `var(--status-${run.tone}-soft-fg)`,
    border: `1px solid var(--status-${run.tone}-soft-border)`,
  }
  return onOpen ? (
    <button
      type="button"
      title={`${run.hint} — ${TICKET_RUN_TEXT.openRun}`}
      className={`${className} hover:brightness-95`}
      style={style}
      onClick={stop(() => onOpen(run.open))}
    >
      {body}
    </button>
  ) : (
    <span title={run.hint} className={className} style={style}>
      {body}
    </span>
  )
}

/** The run working a ticket as a dot and its words, the way the Processes list says a run; pressing the words opens it. */
export function TicketRunWords({ run, onOpen }: Opens) {
  const body = (
    <>
      <TicketRunDot run={run} />
      <Words run={run} />
    </>
  )
  return onOpen ? (
    <button
      type="button"
      title={`${run.hint} — ${TICKET_RUN_TEXT.openRun}`}
      className="inline-flex min-w-0 items-center gap-1.5 text-left text-[11.5px] hover:underline"
      onClick={stop(() => onOpen(run.open))}
    >
      {body}
    </button>
  ) : (
    <span title={run.hint} className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px]">
      {body}
    </span>
  )
}

/**
 * The run working a ticket on its page, on top: its words and what more its
 * run says, Open run, and below them the run's own card while it waits on
 * the person or works — answered here as in its review chat.
 */
export function TicketRunStrip({ run, onOpen, card }: Opens & { card?: ReactNode }) {
  return (
    <section
      aria-label={run.label}
      className="flex min-w-0 flex-col gap-2 rounded-lg p-3"
      style={{
        background: `var(--status-${run.tone}-soft-bg)`,
        border: `1px solid var(--status-${run.tone}-soft-border)`,
      }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <TicketRunDot run={run} />
        <Words run={run} />
        {onOpen ? (
          <span className="ml-auto shrink-0">
            <Button size="sm" variant="secondary" onClick={() => onOpen(run.open)}>
              {TICKET_RUN_TEXT.openRun}
            </Button>
          </span>
        ) : null}
      </div>
      {!card && run.hint !== run.state ? (
        <p className="m-0 text-[12px] text-(--text-secondary)">{run.hint}</p>
      ) : null}
      {card ? (
        <div className="flex min-w-0 flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
          {card}
        </div>
      ) : null}
    </section>
  )
}
