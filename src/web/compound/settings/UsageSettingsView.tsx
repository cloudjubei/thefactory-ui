import {
  DAILY_USAGE_RANGE_OPTIONS,
  DAILY_USAGE_TEXT,
} from '../../../headless/utils/dailyUsageConstants'
import type {
  DailyUsageDay,
  DailyUsageModelRow,
  DailyUsageStatus,
  DailyUsageView,
} from '../../../headless/utils/dailyUsageTypes'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'

export interface UsageSettingsViewProps {
  view: DailyUsageView
  days: number
  onDaysChange: (days: number) => void
  /** `true` until the first read lands. */
  loading: boolean
  error?: string
  onRebuild: () => void
  rebuilding: boolean
}

const MODEL_COLUMNS: ReadonlyArray<{
  cell: Exclude<keyof DailyUsageModelRow, 'key' | 'source'>
  label: string
}> = [
  { cell: 'name', label: DAILY_USAGE_TEXT.columns.model },
  { cell: 'calls', label: DAILY_USAGE_TEXT.columns.calls },
  { cell: 'charged', label: DAILY_USAGE_TEXT.columns.charged },
  { cell: 'listValue', label: DAILY_USAGE_TEXT.columns.listValue },
  { cell: 'input', label: DAILY_USAGE_TEXT.columns.input },
  { cell: 'output', label: DAILY_USAGE_TEXT.columns.output },
  { cell: 'cacheRead', label: DAILY_USAGE_TEXT.columns.cacheRead },
  { cell: 'cacheWrite', label: DAILY_USAGE_TEXT.columns.cacheWrite },
  { cell: 'cacheShare', label: DAILY_USAGE_TEXT.columns.cacheShare },
]

const STATUS_TONE: Record<DailyUsageStatus, string> = {
  complete: '',
  partial: 'text-(--status-working-soft-fg)',
  unknown: 'text-(--status-stuck-soft-fg)',
}

function ModelTable({ rows }: { rows: DailyUsageModelRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-(--border-subtle)">
      <table className="min-w-full text-sm tabular-nums">
        <thead className="bg-(--surface-raised) text-(--text-secondary)">
          <tr>
            {MODEL_COLUMNS.map((c) => (
              <th key={c.cell} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-(--border-subtle)">
              {MODEL_COLUMNS.map((c) => (
                <td key={c.cell} className="px-2 py-1.5 align-top whitespace-nowrap">
                  {row[c.cell]}
                  {c.cell === 'name' ? (
                    <span className="ml-1.5 text-[11px] text-(--text-secondary)">{row.source}</span>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ToolBreakdown({ day }: { day: DailyUsageDay }) {
  if (day.tools.length === 0 && day.unattributed.length === 0) return null
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-(--text-secondary)">{DAILY_USAGE_TEXT.tools}</summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-[12px] text-(--text-secondary)">{DAILY_USAGE_TEXT.toolsNote}</p>
        <ul className="flex flex-col gap-1">
          {day.tools.map((tool) => (
            <li key={tool.key} className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
              <span className="font-medium text-(--text-primary)">{tool.name}</span>
              <span>{tool.charged}</span>
              <span className="text-(--text-secondary)">{tool.calls}</span>
              {tool.averaged ? (
                <span className="text-[12px] text-(--text-secondary)">{tool.averaged}</span>
              ) : null}
            </li>
          ))}
        </ul>
        {day.unattributed.length > 0 ? (
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-(--text-secondary)">
              {DAILY_USAGE_TEXT.unattributed}
            </div>
            <ul className="flex flex-col gap-1">
              {day.unattributed.map((row) => (
                <li key={row.key} className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
                  <span className="text-(--text-primary)">{row.name}</span>
                  <span>{row.charged}</span>
                  <span className="text-(--text-secondary)">{row.calls}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  )
}

function UsageDay({ day }: { day: DailyUsageDay }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-(--border-subtle) px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm tabular-nums">
        <span className="font-medium text-(--text-primary)">{day.label}</span>
        <span className="text-(--text-primary)">{day.charged}</span>
        <span className="text-(--text-secondary)">{day.listValue}</span>
        <span className="text-(--text-secondary)">{day.calls}</span>
        {day.completeness ? (
          <span className={STATUS_TONE[day.status]}>{day.completeness}</span>
        ) : null}
      </div>
      {day.anomalies.map((anomaly) => (
        <div
          key={anomaly.key}
          className="rounded-md border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-2 py-1 text-sm text-(--status-working-soft-fg)"
        >
          <span className="font-medium">{anomaly.title}</span> · {anomaly.detail}
        </div>
      ))}
      {day.models.length > 0 ? <ModelTable rows={day.models} /> : null}
      <ToolBreakdown day={day} />
    </li>
  )
}

/**
 * Settings › Usage, laid out from the headless daily usage view: each UTC
 * day's charge and list-price estimate, its calls short of counts, its cache
 * anomalies, a table per provider and model, and the spend per tool.
 */
export default function UsageSettingsView({
  view,
  days,
  onDaysChange,
  loading,
  error,
  onRebuild,
  rebuilding,
}: UsageSettingsViewProps) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{DAILY_USAGE_TEXT.title}</h2>
        <p className="max-w-2xl text-sm text-(--text-secondary)">{DAILY_USAGE_TEXT.intro}</p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          size="sm"
          ariaLabel={DAILY_USAGE_TEXT.title}
          options={DAILY_USAGE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={String(days)}
          onChange={(value) => onDaysChange(Number(value))}
        />
        {view.days.length > 0 ? (
          <span className={`text-sm tabular-nums ${STATUS_TONE[view.total.status]}`}>
            {DAILY_USAGE_TEXT.total}: <span className="font-semibold">{view.total.charged}</span>
            {' · '}
            {view.total.listValue} · {view.total.calls}
          </span>
        ) : null}
        <Button variant="secondary" size="sm" loading={rebuilding} onClick={onRebuild}>
          {DAILY_USAGE_TEXT.rebuild}
        </Button>
      </div>
      {error ? <p className="text-sm text-(--status-stuck-soft-fg)">{error}</p> : null}
      {loading && view.days.length === 0 ? (
        <p className="text-sm text-(--text-muted)">{DAILY_USAGE_TEXT.reading}</p>
      ) : view.days.length === 0 ? (
        <p className="text-sm text-(--text-muted)">{DAILY_USAGE_TEXT.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {view.days.map((day) => (
            <UsageDay key={day.day} day={day} />
          ))}
        </ul>
      )}
    </section>
  )
}
