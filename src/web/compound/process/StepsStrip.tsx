import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

import {
  STEPS_STRIP_COPY,
  stepsStripView,
  type StepsStripEntry,
  type StepsStripModel,
} from '../../../headless'
import { IconChevronDown } from '../../icons'

export type StepsStripProps = {
  model: StepsStripModel
  /** A narrow strip folds always: `✓ N/M`, the current step, `+N`. */
  narrow?: boolean
}

function Dot({ entry }: { entry: StepsStripEntry }) {
  const color = `var(--status-${entry.tone}-bg)`
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full"
      style={{
        border: `1.5px solid ${color}`,
        background: entry.phase === 'done' ? color : 'transparent',
      }}
    />
  )
}

function AttemptPill({ text }: { text: string }) {
  return (
    <span className="shrink-0 rounded-full bg-(--surface-muted) px-1.5 text-[10px] font-semibold text-(--text-secondary)">
      {text}
    </span>
  )
}

function Step({
  entry,
  emphasis,
  narrow,
}: {
  entry: StepsStripEntry
  emphasis: boolean
  narrow: boolean
}) {
  return (
    <span
      title={entry.attempt ? `${entry.label} · ${entry.attempt}` : entry.label}
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full ${emphasis ? 'shrink py-px pl-1 pr-2 font-semibold' : 'shrink-[2]'}`}
      style={{
        maxWidth: emphasis && !narrow ? 280 : 170,
        ...(emphasis
          ? {
              background: `var(--status-${entry.tone}-soft-bg)`,
              color: `var(--status-${entry.tone}-soft-fg)`,
            }
          : { color: entry.phase === 'upcoming' ? 'var(--text-muted)' : 'var(--text-secondary)' }),
      }}
    >
      <Dot entry={entry} />
      <span className="truncate">{entry.label}</span>
      {emphasis && entry.attempt ? <AttemptPill text={entry.attempt} /> : null}
    </span>
  )
}

/**
 * The steps, features or done-when criteria under a run, story or feature
 * header, on one line. A long list folds — finished steps into `✓ N done`, the
 * rest into `+N more` — and either chip opens the whole list.
 */
export default function StepsStrip({ model, narrow = false }: StepsStripProps) {
  const view = useMemo(() => stepsStripView(model.entries, { narrow }), [model.entries, narrow])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (view.items.length === 0) return null

  return (
    <div
      ref={rootRef}
      className="relative flex min-w-0 shrink-0 flex-nowrap items-center gap-1.5 border-b border-(--border-subtle) bg-(--surface-raised) px-3.5 py-2 text-[12px]"
    >
      <span className="mr-1 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {model.label}
      </span>
      {view.items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 ? (
            <span aria-hidden className="shrink-0 text-(--text-muted)">
              —
            </span>
          ) : null}
          {item.kind === 'step' ? (
            <Step entry={item.entry} emphasis={item.emphasis} narrow={narrow} />
          ) : (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${item.label} — ${STEPS_STRIP_COPY.openList}`}
              className="inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11.5px] font-semibold"
              style={
                item.kind === 'done'
                  ? {
                      background: 'var(--status-done-soft-bg)',
                      color: 'var(--status-done-soft-fg)',
                      border: '1px solid var(--status-done-soft-border)',
                    }
                  : {
                      background: 'var(--surface-raised)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-default)',
                    }
              }
            >
              {item.label}
              <IconChevronDown className="size-2.5" />
            </button>
          )}
        </Fragment>
      ))}
      {open ? (
        <div
          role="dialog"
          aria-label={STEPS_STRIP_COPY.listTitle}
          className="absolute left-3.5 top-full z-30 mt-1 max-h-[360px] w-[340px] max-w-[calc(100%-28px)] overflow-y-auto rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-1.5 shadow-xl"
        >
          {model.entries.map((entry) => (
            <div
              key={entry.key}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] ${entry.phase === 'current' ? 'font-semibold' : ''}`}
              style={
                entry.phase === 'current'
                  ? {
                      background: `var(--status-${entry.tone}-soft-bg)`,
                      color: `var(--status-${entry.tone}-soft-fg)`,
                    }
                  : {
                      color:
                        entry.phase === 'upcoming' ? 'var(--text-muted)' : 'var(--text-secondary)',
                    }
              }
            >
              <Dot entry={entry} />
              <span className="min-w-0 flex-1 truncate" title={entry.label}>
                {entry.label}
              </span>
              {entry.attempt ? <AttemptPill text={entry.attempt} /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
