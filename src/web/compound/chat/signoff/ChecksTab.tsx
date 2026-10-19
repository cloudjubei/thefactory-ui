import type { ReactNode } from 'react'

import {
  AGENT_UNREACHABLE,
  aggregateTestCounts,
  capabilitySetupOffered,
  checkActionOffer,
  handoffRequest,
  ranCheckMethods,
  reviewCheckMeta,
  testLayerLines,
  testTotalsHeadline,
  TERMINAL_RAW_OUTPUT_LABEL,
  type CheckActionHost,
  type CheckMethodId,
  type CheckMethodRow,
  type CheckTestResults,
  type ReviewCheckRow,
  type TestTotalsOutcome,
} from '../../../../headless'
import { CheckChip, HandoffButton, RunActionButton, SetUpWithAgentButton } from '../../chips'
import { TerminalOutput } from '../../TerminalOutput'
import { TestResultsList } from '../../tests'
import { DURATION_CHIP_CLASS } from '../ToolCall/StatusIcon'
import { TONE_TEXT } from './tones'
import { UnfinishedTests } from './UnfinishedTests'

export type ChecksTabProps = {
  /** The method rows this tab owns (tests, or the build-side methods). */
  methods: readonly CheckMethodRow[]
  /** Every individual check that rolled up into those methods. */
  checks: readonly ReviewCheckRow[]
  branch: string | undefined
  busyId: CheckMethodId | undefined
  /** What this panel can do about a check; absent on a read-only record, which offers no control. */
  actions?: CheckActionHost
  /** Shown when the tab owns no method with anything to say — e.g. no tests at all. */
  emptyState?: { title: string; body: string }
  /** Opens a chat drafted to set a missing capability up, in place of the hand-off. */
  onSetUp?: (row: CheckMethodRow) => void
}

/** A plain note about the record itself — what it cannot show, or what the run could not cover. */
function RecordNote({ text }: { text: string }) {
  return (
    <p className="rounded border border-(--status-review-soft-border) bg-(--status-review-soft-bg) px-2 py-1.5 text-[11.5px] text-(--status-review-soft-fg)">
      {text}
    </p>
  )
}

const TOTALS_TONE: Record<TestTotalsOutcome, string> = {
  failed:
    'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)',
  unfinished:
    'border-(--status-working-soft-border) bg-(--status-working-soft-bg) text-(--status-working-soft-fg)',
  none: 'border-(--status-review-soft-border) bg-(--status-review-soft-bg) text-(--status-review-soft-fg)',
  passed:
    'border-(--status-done-soft-border) bg-(--status-done-soft-bg) text-(--status-done-soft-fg)',
}

/** One block — the same shape for a build method and for a single test layer. */
function CheckBlock({
  row,
  title,
  command,
  meta,
  summary,
  durationLabel,
  output,
  testResults,
  legacyNote,
  coverageNote,
  branch,
  busy,
  actions,
  onSetUp,
}: {
  row: CheckMethodRow
  title: ReactNode
  command: string | undefined
  /** The variant it ran on and why, the modules, the tests it counted, where it ran. */
  meta: string | undefined
  summary: string
  durationLabel: string | undefined
  output: string | undefined
  /** Its test run, drawn by the Tests display above its raw output, which stays folded. */
  testResults: CheckTestResults | undefined
  /** Why the record cannot say what ran — it predates commands and output being kept. */
  legacyNote: string | undefined
  /** What the run could not cover, and why. */
  coverageNote: string | undefined
  branch: string | undefined
  busy: boolean
  actions: CheckActionHost | undefined
  onSetUp: ((row: CheckMethodRow) => void) | undefined
}) {
  const offer = checkActionOffer(row.action, actions)
  const setUp = onSetUp && capabilitySetupOffered(row) ? onSetUp : undefined
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

      {meta ? <span className="text-[11px] text-(--text-muted)">{meta}</span> : null}

      {legacyNote ? <RecordNote text={legacyNote} /> : null}
      {coverageNote ? <RecordNote text={coverageNote} /> : null}

      {testResults ? (
        <>
          {testResults.unrecordedNote ? <RecordNote text={testResults.unrecordedNote} /> : null}
          {testResults.unfinished ? <UnfinishedTests view={testResults.unfinished} /> : null}
          {testResults.results ? <TestResultsList results={testResults.results} /> : null}
          {testResults.omittedLabel ? (
            <span className="text-[11px] text-(--text-muted)">{testResults.omittedLabel}</span>
          ) : null}
          {output ? (
            <TerminalOutput text={output} label={TERMINAL_RAW_OUTPUT_LABEL} collapsed />
          ) : null}
        </>
      ) : output ? (
        <TerminalOutput text={output} />
      ) : null}

      {/* The action is the card's LAST element, always, on its own line.
          Laid out as a wrapping ROW it trailed the sentence and only dropped
          below once the row overflowed — so the button's position moved with
          the length of the prose beside it. A column also lets a long button
          label wrap inside its own box instead of running past the border. */}
      {row.action.kind === 'run' ? (
        <div className="flex flex-col items-start gap-2">
          <span className="text-[12px] text-(--text-secondary)">
            Nothing was captured for {row.noun}.
          </span>
          {offer.kind === 'run' && actions ? (
            <RunActionButton busy={busy} onClick={() => actions.onRun(row)}>
              Run it now
            </RunActionButton>
          ) : null}
        </div>
      ) : row.action.kind === 'request' && (row.action.purpose === 'setup' || actions) ? (
        <div className="flex flex-col items-start gap-2">
          {row.action.purpose === 'setup' ? (
            <span className="text-[12px] text-(--text-secondary)">
              {row.detail} Setting it up is a code change, so it is work for the agent.
            </span>
          ) : null}
          {setUp ? (
            <SetUpWithAgentButton onClick={() => setUp(row)} />
          ) : offer.kind === 'request' && actions ? (
            <>
              {offer.unreachable ? (
                <span className="text-[11px] text-(--text-muted)">{AGENT_UNREACHABLE}</span>
              ) : null}
              <HandoffButton
                disabled={busy || offer.unreachable}
                onClick={() => actions.onRequest(row, offer.purpose)}
              >
                {handoffRequest(row, offer.purpose, { branch }).buttonLabel}
              </HandoffButton>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/**
 * One block per method that ran — what did not is the chips' to say — and, for
 * tests, one block PER LAYER, because unit, integration and end-to-end each
 * carry their own state, their own time and their own way to be filled. Above
 * them sits the run's aggregate, so the pane answers "did the tests pass"
 * before it answers "which ones".
 */
export default function ChecksTab({
  methods,
  checks,
  branch,
  busyId,
  actions,
  emptyState,
  onSetUp,
}: ChecksTabProps) {
  const allUnconfigured = methods.length > 0 && methods.every((m) => m.state === 'unconfigured')
  if (emptyState && allUnconfigured) {
    const first = methods[0]
    const setup = checkActionOffer(
      { kind: 'request', purpose: 'setup', approachId: undefined },
      actions,
    )
    return (
      <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
        <div className="text-[13px] font-semibold text-(--text-primary)">{emptyState.title}</div>
        <p className="max-w-[64ch] text-[12px] text-(--text-secondary)">{emptyState.body}</p>
        {onSetUp && first && capabilitySetupOffered(first) ? (
          <div>
            <SetUpWithAgentButton onClick={() => onSetUp(first)} />
          </div>
        ) : setup.kind === 'request' && actions ? (
          <div className="flex flex-wrap items-center gap-2">
            <HandoffButton
              disabled={setup.unreachable}
              onClick={() => actions.onRequest(first, 'setup')}
            >
              {handoffRequest(first, 'setup', { branch }).buttonLabel}
            </HandoffButton>
            {setup.unreachable ? (
              <span className="text-[11px] text-(--text-muted)">{AGENT_UNREACHABLE}</span>
            ) : null}
          </div>
        ) : null}
      </section>
    )
  }

  const ran = ranCheckMethods(methods)
  const testsRow = ran.length === 1 && ran[0]?.id === 'tests' ? ran[0] : undefined
  const layers = testsRow ? checks.filter((c) => testsRow.checkIds.includes(c.id)) : []
  const totals = testsRow ? aggregateTestCounts(layers) : undefined
  const headline = totals ? testTotalsHeadline(totals, layers) : undefined

  return (
    <div className="flex flex-col gap-2">
      {totals && headline ? (
        <div
          className={`flex flex-wrap items-center gap-3 rounded-md border px-2.5 py-1.5 text-[12px] ${TOTALS_TONE[headline.outcome]}`}
        >
          <span className="font-semibold">{headline.title}</span>
          <span className="flex-1" />
          {headline.countsLabel ? (
            <span className="tabular-nums">{headline.countsLabel}</span>
          ) : (
            <>
              <span className="tabular-nums">✓ {totals.passed}</span>
              <span className="tabular-nums">✗ {totals.failed}</span>
              <span className="tabular-nums">○ {totals.skipped}</span>
              <span className="tabular-nums opacity-80">
                • {totals.total} across {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
              </span>
            </>
          )}
        </div>
      ) : null}

      {testsRow && layers.length > 0
        ? layers.map((layer) => {
            const lines = testLayerLines(layer, layers.length)
            return (
              <CheckBlock
                key={layer.id}
                row={testsRow}
                title={
                  <span className={`text-[12px] font-semibold ${TONE_TEXT[layer.tone]}`}>
                    {layer.label}
                  </span>
                }
                command={layer.command}
                meta={lines.meta}
                summary={lines.summary ?? ''}
                durationLabel={layer.durationLabel}
                output={layer.details}
                testResults={layer.testResults}
                legacyNote={layer.legacyNote}
                coverageNote={layer.coverageNote}
                branch={branch}
                busy={busyId === testsRow.id}
                actions={actions}
                onSetUp={onSetUp}
              />
            )
          })
        : ran.map((row) => {
            const mine = checks.filter((c) => row.checkIds.includes(c.id))
            return (
              <CheckBlock
                key={row.id}
                row={row}
                title={<CheckChip row={row} inert />}
                command={mine.length === 1 ? (mine[0].command ?? mine[0].label) : undefined}
                meta={mine.length === 1 ? reviewCheckMeta(mine[0]) : undefined}
                summary={row.detail}
                durationLabel={row.durationLabel}
                output={row.output}
                testResults={mine.length === 1 ? mine[0].testResults : undefined}
                legacyNote={mine.length === 1 ? mine[0].legacyNote : undefined}
                coverageNote={mine.length === 1 ? mine[0].coverageNote : undefined}
                branch={branch}
                busy={busyId === row.id}
                actions={actions}
                onSetUp={onSetUp}
              />
            )
          })}
    </div>
  )
}
