import type { ReactNode } from 'react'

import {
  AGENT_UNREACHABLE,
  aggregateTestCounts,
  handoffRequest,
  parseTestFailures,
  type CheckMethodId,
  type CheckMethodRow,
  type HandoffPurpose,
  type ReviewCheckRow,
  type TestFailure,
} from '../../../../headless'
import { CheckChip, HandoffButton, RunActionButton } from '../../chips'
import { DURATION_CHIP_CLASS } from '../ToolCall/StatusIcon'
import { TONE_TEXT } from './tones'

export type ChecksTabProps = {
  /** The method rows this tab owns (tests, or the build-side methods). */
  methods: readonly CheckMethodRow[]
  /** Every individual check that rolled up into those methods. */
  checks: readonly ReviewCheckRow[]
  branch: string | undefined
  busyId: CheckMethodId | undefined
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
  /** Shown when the tab owns no method with anything to say — e.g. no tests at all. */
  emptyState?: { title: string; body: string }
}

/**
 * The command output, always visible. The 132px cap IS the containment — hiding
 * it behind a toggle meant the one thing a reviewer opens this tab to read was
 * the one thing they had to go looking for.
 */
function Console({ text, stream }: { text: string; stream: 'stdout' | 'stderr' }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {stream}
      </div>
      <pre className="max-h-[132px] overflow-auto rounded border border-(--border-subtle) bg-(--surface-overlay) p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap wrap-break-word text-(--text-secondary)">
        {text}
      </pre>
    </div>
  )
}

/** A failing test, laid out so the assertion is readable without opening a log. */
function Failure({ path, name, message }: TestFailure) {
  return (
    <div className="flex flex-col gap-0.5 rounded border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) p-2">
      {path ? <span className="font-mono text-[11px] text-(--text-muted)">{path}</span> : null}
      {name ? <span className="text-[12px] font-medium text-(--text-primary)">{name}</span> : null}
      {message ? (
        <span className="font-mono text-[11px] whitespace-pre-wrap text-(--status-stuck-soft-fg)">
          {message}
        </span>
      ) : null}
    </div>
  )
}

/** One block — the same shape for a build method and for a single test layer. */
function CheckBlock({
  row,
  title,
  command,
  failed,
  summary,
  durationLabel,
  output,
  failures,
  branch,
  busy,
  canRequest,
  onRun,
  onRequest,
}: {
  row: CheckMethodRow
  title: ReactNode
  command: string | undefined
  failed: boolean
  summary: string
  durationLabel: string | undefined
  output: string | undefined
  failures: readonly TestFailure[]
  branch: string | undefined
  busy: boolean
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
}) {
  const action = row.action
  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {title}
        {command ? (
          <code className="font-mono text-[11px] text-(--text-secondary)">{command}</code>
        ) : (
          <span className="text-[11px] text-(--text-muted)">{summary}</span>
        )}
        <span className="flex-1" />
        {durationLabel ? <span className={DURATION_CHIP_CLASS}>{durationLabel}</span> : null}
      </div>

      {command && summary ? (
        <span className="text-[11.5px] text-(--text-secondary)">{summary}</span>
      ) : null}

      {failures.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {failures.map((f, i) => (
            <Failure key={`${f.path}-${f.name}-${i}`} {...f} />
          ))}
        </div>
      ) : output ? (
        <Console text={output} stream={failed ? 'stderr' : 'stdout'} />
      ) : null}

      {action.kind === 'run' ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12px] text-(--text-secondary)">
            Nothing was captured for {row.noun}.
          </span>
          <RunActionButton busy={busy} onClick={() => onRun(row)}>
            Run it now
          </RunActionButton>
        </div>
      ) : action.kind === 'request' ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {action.purpose === 'setup' ? (
            <span className="text-[12px] text-(--text-secondary)">
              {row.detail} Setting it up is a code change, so it is work for the agent.
            </span>
          ) : null}
          <HandoffButton
            disabled={busy || (action.purpose !== 'capture' && !canRequest)}
            onClick={() => onRequest(row, action.purpose)}
          >
            {handoffRequest(row, action.purpose, { branch }).buttonLabel}
          </HandoffButton>
          {action.purpose !== 'capture' && !canRequest ? (
            <span className="text-[11px] text-(--text-muted)">{AGENT_UNREACHABLE}</span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/**
 * One block per method — and, for tests, one block PER LAYER, because unit,
 * integration and end-to-end each carry their own state, their own time and
 * their own way to be filled. Above them sits the run's aggregate, so the pane
 * answers "did the tests pass" before it answers "which ones".
 */
export default function ChecksTab({
  methods,
  checks,
  branch,
  busyId,
  canRequest,
  onRun,
  onRequest,
  emptyState,
}: ChecksTabProps) {
  const allUnconfigured = methods.length > 0 && methods.every((m) => m.state === 'unconfigured')
  if (emptyState && allUnconfigured) {
    const first = methods[0]
    return (
      <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
        <div className="text-[13px] font-semibold text-(--text-primary)">{emptyState.title}</div>
        <p className="max-w-[64ch] text-[12px] text-(--text-secondary)">{emptyState.body}</p>
        <div className="flex flex-wrap items-center gap-2">
          <HandoffButton disabled={!canRequest} onClick={() => onRequest(first, 'setup')}>
            {handoffRequest(first, 'setup', { branch }).buttonLabel}
          </HandoffButton>
          {!canRequest ? (
            <span className="text-[11px] text-(--text-muted)">{AGENT_UNREACHABLE}</span>
          ) : null}
        </div>
      </section>
    )
  }

  const testsRow = methods.length === 1 && methods[0]?.id === 'tests' ? methods[0] : undefined
  const layers = testsRow ? checks.filter((c) => testsRow.checkIds.includes(c.id)) : []
  const totals = testsRow ? aggregateTestCounts(layers.map((l) => l.summary)) : undefined
  const anyFailed = layers.some((l) => l.status === 'failed' || l.status === 'error')

  return (
    <div className="flex flex-col gap-2">
      {totals ? (
        <div
          className={`flex flex-wrap items-center gap-3 rounded-md border px-2.5 py-1.5 text-[12px] ${
            anyFailed
              ? 'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)'
              : 'border-(--status-done-soft-border) bg-(--status-done-soft-bg) text-(--status-done-soft-fg)'
          }`}
        >
          <span className="font-semibold">
            {anyFailed ? 'Test run completed with failures' : 'All configured layers passed'}
          </span>
          <span className="flex-1" />
          <span className="tabular-nums">✓ {totals.passed}</span>
          <span className="tabular-nums">✗ {totals.failed}</span>
          <span className="tabular-nums">○ {totals.skipped}</span>
          <span className="tabular-nums opacity-80">
            • {totals.total} across {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
          </span>
        </div>
      ) : null}

      {testsRow && layers.length > 0
        ? layers.map((layer) => (
            <CheckBlock
              key={layer.id}
              row={testsRow}
              title={
                <span className={`text-[12px] font-semibold ${TONE_TEXT[layer.tone]}`}>
                  {layer.label}
                </span>
              }
              command={undefined}
              failed={layer.status !== 'passed' && layer.status !== 'skipped'}
              summary={layer.summary}
              durationLabel={layer.durationLabel}
              output={layer.details}
              failures={layer.status === 'passed' ? [] : parseTestFailures(layer.details)}
              branch={branch}
              busy={busyId === testsRow.id}
              canRequest={canRequest}
              onRun={onRun}
              onRequest={onRequest}
            />
          ))
        : methods.map((row) => {
            const mine = checks.filter((c) => row.checkIds.includes(c.id))
            return (
              <CheckBlock
                key={row.id}
                row={row}
                title={<CheckChip row={row} inert />}
                command={mine.length === 1 ? mine[0].label : undefined}
                failed={row.state === 'failed'}
                summary={row.detail}
                durationLabel={row.durationLabel}
                output={row.output}
                failures={row.state === 'failed' ? parseTestFailures(row.output) : []}
                branch={branch}
                busy={busyId === row.id}
                canRequest={canRequest}
                onRun={onRun}
                onRequest={onRequest}
              />
            )
          })}
    </div>
  )
}
