import { useState, type ReactNode } from 'react'

import {
  runModelKey,
  type ReportTile,
  type RunModel,
  type SignoffCostView,
  type SignoffTimeSegment,
  type SignoffTimeView,
} from '../../../../headless'
import { IconChevronDown } from '../../../icons'
import RunModelChip from '../../chat/signoff/RunModelChip'
import { REVIEW_TONE_TEXT, TIME_PART_FILL } from './tones'

export type ReportTilesProps = { tiles: readonly ReportTile[] }

/**
 * The report's four tiles. Time and Cost open their breakdowns under the row
 * when the runs' work is known: where the time went per step, and the list
 * price per agent role — or a single agent run's model and tokens.
 */
export default function ReportTiles({ tiles }: ReportTilesProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  return (
    <div className="flex flex-col gap-2.5 pb-3.5 pt-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((tile) =>
          tile.detail ? (
            <button
              key={tile.key}
              type="button"
              aria-expanded={open.has(tile.key)}
              onClick={() => toggle(tile.key)}
              className="flex flex-col items-stretch gap-1 rounded-lg border border-(--border-subtle) px-3 py-2.5 text-left hover:bg-(--surface-hover)"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] text-(--text-secondary)">{tile.label}</span>
                <IconChevronDown
                  className={`size-3 text-(--text-muted) transition-transform ${open.has(tile.key) ? 'rotate-180' : ''}`}
                />
              </span>
              <TileBody tile={tile} />
            </button>
          ) : (
            <div
              key={tile.key}
              className="flex flex-col gap-0.5 rounded-lg border border-(--border-subtle) px-3 py-2.5"
            >
              <span className="text-[11.5px] text-(--text-secondary)">{tile.label}</span>
              <TileBody tile={tile} />
            </div>
          ),
        )}
      </div>
      {tiles.map((tile) =>
        tile.detail && open.has(tile.key) ? (
          tile.detail.kind === 'time' ? (
            <TimeBreakdown key={tile.key} view={tile.detail.view} />
          ) : (
            <CostBreakdown key={tile.key} view={tile.detail.view} />
          )
        ) : null,
      )}
    </div>
  )
}

function TileBody({ tile }: { tile: ReportTile }) {
  const detail = tile.detail
  return (
    <>
      <span className={`text-[13.5px] font-semibold tabular-nums ${REVIEW_TONE_TEXT[tile.tone]}`}>
        {tile.value}
      </span>
      {detail?.kind === 'time' ? <Bar segments={detail.view.segments} /> : null}
      {tile.sub ? <span className="text-[11.5px] text-(--text-secondary)">{tile.sub}</span> : null}
      {detail?.kind === 'cost' && detail.view.runs ? (
        <span className="text-[11.5px] text-(--text-secondary)">{detail.view.runs}</span>
      ) : null}
      {detail?.kind === 'cost' ? <ModelChips models={detail.view.models} /> : null}
    </>
  )
}

function ModelChips({ models }: { models: readonly RunModel[] }) {
  if (models.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {models.map((m) => (
        <RunModelChip key={runModelKey(m)} model={m} />
      ))}
    </span>
  )
}

function Bar({ segments }: { segments: readonly SignoffTimeSegment[] }) {
  return (
    <span className="flex h-2 w-full overflow-hidden rounded bg-(--surface-sunken)">
      {segments.map((s) => (
        <span
          key={s.part}
          title={`${s.label} ${s.value}`}
          className={TIME_PART_FILL[s.part]}
          style={{ width: `${s.fraction * 100}%` }}
        />
      ))}
    </span>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-(--border-subtle) px-4 py-3.5">
      {children}
    </section>
  )
}

function TimeBreakdown({ view }: { view: SignoffTimeView }) {
  return (
    <Panel>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-(--text-secondary)">
        {view.legend.map((s) => (
          <span key={s.part} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${TIME_PART_FILL[s.part]}`} />
            {s.label} {s.value}
          </span>
        ))}
        {view.waitingLegend ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-dashed border-(--text-muted)" />
            {view.waitingLegend}
          </span>
        ) : null}
      </div>
      {view.rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_72px] items-center gap-3 text-[13px]"
        >
          <span className="truncate text-(--text-primary)">{row.label}</span>
          <Bar segments={row.segments} />
          <span className="text-right tabular-nums text-(--text-secondary)">{row.total}</span>
        </div>
      ))}
    </Panel>
  )
}

function CostBreakdown({ view }: { view: SignoffCostView }) {
  return (
    <Panel>
      {view.note ? <span className="text-[12px] text-(--text-secondary)">{view.note}</span> : null}
      {view.rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[minmax(0,170px)_minmax(0,1fr)_72px] items-center gap-3 text-[13px]"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-(--text-primary)">{row.label}</span>
            <ModelChips models={row.models} />
          </span>
          <span className="flex h-2 w-full overflow-hidden rounded bg-(--surface-sunken)">
            <span className="bg-(--accent-primary)" style={{ width: `${row.fraction * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-(--text-secondary)">{row.amount}</span>
        </div>
      ))}
      {view.tokens ? (
        <div className="flex flex-col gap-1.5">
          <span className="flex">
            <RunModelChip model={view.tokens.model} />
          </span>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {view.tokens.rows.map((r) => (
              <span key={r.label} className="flex flex-col text-[12px]">
                <span className="text-(--text-secondary)">{r.label}</span>
                <span className="tabular-nums text-(--text-primary)">{r.value}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
