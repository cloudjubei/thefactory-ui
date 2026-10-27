import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  PROCESS_ACCEPTED_UNCHECKED_COUNT,
  PROCESS_ACCEPTED_UNCHECKED_TONE,
  STEPS_STRIP_COPY,
  stepsStripFolds,
  stepsStripMeasureKey,
  stepsStripShrink,
  stepsStripView,
  type ProcessStatusTone,
  type StepsStripEntry,
  type StepsStripModel,
} from '../../../headless'
import { IconChevronDown } from '../../icons'

export type StepsStripProps = {
  model: StepsStripModel
  /**
   * A narrow strip folds always: `✓ N/M`, the current step, `+N`. Any other
   * strip folds the same way once its steps do not fit.
   */
  narrow?: boolean
}

type StripFit = { key: string; fullWidth: number; room: number }

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

/** What a step's hover says: its name, its attempt, and who accepted it when it was never proven. */
function stepTitle(entry: StepsStripEntry): string {
  return [entry.label, entry.attempt, entry.acceptedUnchecked].filter(Boolean).join(' · ')
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
      title={stepTitle(entry)}
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full ${emphasis ? 'py-px pl-1 pr-2 font-semibold' : ''}`}
      style={{
        flexShrink: stepsStripShrink(entry, emphasis, narrow),
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

/** The folded `✓ N done` chip — in the gold of "Accepted unchecked" when it holds such steps. */
function doneChipStyle(tone: ProcessStatusTone) {
  return {
    background: `var(--status-${tone}-soft-bg)`,
    color: `var(--status-${tone}-soft-fg)`,
    border: `1px solid var(--status-${tone}-soft-border)`,
  }
}

/**
 * The steps, features or done-when criteria under a run, story or feature
 * header, on one line. A long list folds — finished steps into `✓ N done`, the
 * rest into `+N more` — and either chip opens the whole list.
 */
export default function StepsStrip({ model, narrow = false }: StepsStripProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const measureKey = useMemo(() => stepsStripMeasureKey(model.entries), [model.entries])
  const [fit, setFit] = useState<StripFit>()
  const measured = fit?.key === measureKey ? fit : undefined
  const folds = stepsStripFolds({
    narrow,
    ...(measured ? { fullWidth: measured.fullWidth, room: measured.room } : {}),
  })
  const view = useMemo(
    () => stepsStripView(model.entries, { narrow: folds }),
    [model.entries, folds],
  )

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el || narrow) return
    const measure = () =>
      setFit((prev) => {
        const kept = prev?.key === measureKey ? prev : undefined
        const fullWidth = folds && kept ? kept.fullWidth : el.scrollWidth
        const room = el.clientWidth
        return kept && kept.fullWidth === fullWidth && kept.room === room
          ? kept
          : { key: measureKey, fullWidth, room }
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [narrow, folds, measureKey])

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
      className={`relative flex min-w-0 shrink-0 ${folds ? 'flex-wrap gap-y-1' : 'flex-nowrap'} items-center gap-x-1.5 border-b border-(--border-subtle) bg-(--surface-raised) px-3.5 py-2 text-[12px]`}
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
            <Step entry={item.entry} emphasis={item.emphasis} narrow={folds} />
          ) : (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${item.label} — ${STEPS_STRIP_COPY.openList}`}
              title={
                item.kind === 'done' && item.acceptedUnchecked > 0
                  ? PROCESS_ACCEPTED_UNCHECKED_COUNT(item.acceptedUnchecked)
                  : undefined
              }
              className="inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11.5px] font-semibold"
              style={
                item.kind === 'done'
                  ? doneChipStyle(
                      item.acceptedUnchecked > 0 ? PROCESS_ACCEPTED_UNCHECKED_TONE : 'done',
                    )
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
              <span className="flex min-w-0 flex-1 flex-col" title={stepTitle(entry)}>
                <span className="truncate">{entry.label}</span>
                {entry.acceptedUnchecked ? (
                  <span
                    className="truncate text-[11.5px] font-normal"
                    style={{ color: `var(--status-${entry.tone}-soft-fg)` }}
                  >
                    {entry.acceptedUnchecked}
                  </span>
                ) : null}
              </span>
              {entry.attempt ? <AttemptPill text={entry.attempt} /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
