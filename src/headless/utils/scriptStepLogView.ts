import type { ProcessLedgerEntry, ScriptLog, ScriptLogLine } from 'thefactory-tools/types'
import {
  SCRIPT_LOG_ASK_KIND,
  SCRIPT_LOG_LABEL,
  SCRIPT_LOG_TAKE_OVER_KIND,
  SCRIPT_RECORDING_LABEL,
  SCRIPT_STOPPED_SCREENSHOT_LABEL,
  SCRIPT_TAKE_OVER_OUTCOMES,
} from 'thefactory-tools/constants'
import { parseScriptLog } from 'thefactory-tools/utils'

import { formatCostUSD } from './costDetails'
import { stepFilingsOf } from './processStepRow'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import {
  SCRIPT_ASK_BADGE,
  SCRIPT_OWN_KIND_TONE,
  SCRIPT_SOURCE_BADGES,
  SCRIPT_STEP_LOG_COPY,
  SCRIPT_TAKE_OVER_BADGE,
  SCRIPT_TAKE_OVER_BADGES,
} from './scriptStepLogViewConstants'
import type {
  ScriptLogBadge,
  ScriptLogRowView,
  ScriptLogSectionView,
  ScriptStepLogView,
} from './scriptStepLogViewTypes'

const addCost = (sum: number | undefined, cost: number | undefined): number | undefined =>
  cost === undefined || !Number.isFinite(cost) ? sum : (sum ?? 0) + cost

const isAsk = (line: ScriptLogLine): boolean => line.kind === SCRIPT_LOG_ASK_KIND

const isTakeOver = (line: ScriptLogLine): boolean => line.kind === SCRIPT_LOG_TAKE_OVER_KIND

function takeOverBadge(line: ScriptLogLine): ScriptLogBadge {
  const outcome = SCRIPT_TAKE_OVER_OUTCOMES.find((one) => one === line.outcome)
  return outcome ? SCRIPT_TAKE_OVER_BADGES[outcome] : SCRIPT_TAKE_OVER_BADGE
}

function kindBadge(line: ScriptLogLine): ScriptLogBadge {
  if (isAsk(line)) return SCRIPT_ASK_BADGE
  if (isTakeOver(line)) return takeOverBadge(line)
  return { label: line.kind, tone: SCRIPT_OWN_KIND_TONE }
}

function rowOf(line: ScriptLogLine, key: string): ScriptLogRowView {
  return {
    key,
    kind: line.kind,
    kindBadge: kindBadge(line),
    title: line.title,
    detail: line.detail,
    items: line.items ?? [],
    sourceBadge: line.source ? SCRIPT_SOURCE_BADGES[line.source] : undefined,
    cost: Number.isFinite(line.costUsd) ? formatCostUSD(line.costUsd) : undefined,
  }
}

function countsLine(
  asks: readonly ScriptLogLine[],
  takeOvers: number,
  sayNoAsks: boolean,
): string[] {
  const live = asks.filter((line) => line.source === 'live').length
  const asked =
    asks.length > 0 || sayNoAsks
      ? [
          [
            SCRIPT_STEP_LOG_COPY.asks(asks.length),
            ...(live > 0 ? [SCRIPT_STEP_LOG_COPY.live(live)] : []),
          ].join(', '),
        ]
      : []
  return [...asked, ...(takeOvers > 0 ? [SCRIPT_STEP_LOG_COPY.takeOvers(takeOvers)] : [])]
}

function sectionOf(
  title: string,
  at: number,
  lines: readonly ScriptLogLine[],
): ScriptLogSectionView {
  const key = `section-${at}`
  const asks = lines.filter(isAsk)
  const takeOvers = lines.filter(isTakeOver)
  const costUsd = lines.reduce<number | undefined>(
    (sum, line) => addCost(sum, line.costUsd),
    undefined,
  )
  const worst =
    takeOvers.find((line) => line.outcome === 'failed') ??
    takeOvers.find((line) => line.outcome === 'handed-back') ??
    takeOvers[0]
  return {
    key,
    title,
    line: [
      SCRIPT_STEP_LOG_COPY.lines(lines.length),
      ...countsLine(asks, takeOvers.length, false),
    ].join(' · '),
    rows: lines.map((line, row) => rowOf(line, `${key}-${row}`)),
    takeOverBadge: worst ? takeOverBadge(worst) : undefined,
    costUsd,
    cost: formatCostUSD(costUsd),
  }
}

/**
 * A step log as sections: each section once, in the order it first came,
 * with its lines in order — each by its kind, title, detail, items, where an
 * ask's answer came from and what it cost — how many asks and take-overs it
 * had, its worst take-over, and what it cost. Pure.
 */
export function scriptLogSections(log: ScriptLog): ScriptLogSectionView[] {
  const bySection = new Map<string, ScriptLogLine[]>()
  for (const line of log.lines) {
    const held = bySection.get(line.section)
    if (held) held.push(line)
    else bySection.set(line.section, [line])
  }
  return [...bySection.entries()].map(([title, lines], at) => sectionOf(title, at, lines))
}

const filedAs = (
  tiles: readonly EvidenceTile[],
  kind: EvidenceTile['ref']['kind'],
  label: string,
): EvidenceTile | undefined =>
  tiles.find((tile) => tile.ref.kind === kind && tile.ref.label === label)

function summaryLine(log: ScriptLog, sections: number): string {
  const asks = log.lines.filter(isAsk)
  const takeOvers = log.lines.filter(isTakeOver).length
  return [SCRIPT_STEP_LOG_COPY.sections(sections), ...countsLine(asks, takeOvers, true)].join(' · ')
}

/**
 * What a script step's attempt shows, from what its run filed: the sections
 * of its step log, the recording of the run and, when the script stopped
 * short, the screenshot of where. `tiles` are the run's filings, the step
 * log's text read. Pure.
 */
export function scriptStepLogView(
  tiles: readonly EvidenceTile[],
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt' | 'status'> | undefined,
): ScriptStepLogView {
  const filed = stepFilingsOf(tiles, entry)
  const logTile = filedAs(filed, 'log', SCRIPT_LOG_LABEL)
  const log = parseScriptLog(logTile?.text ?? '')
  const sections = scriptLogSections(log)
  const costUsd = sections.reduce<number | undefined>(
    (sum, section) => addCost(sum, section.costUsd),
    undefined,
  )
  const empty =
    sections.length > 0 || log.problems.length > 0
      ? undefined
      : logTile
        ? SCRIPT_STEP_LOG_COPY.logUnreadable
        : entry?.status === 'running'
          ? SCRIPT_STEP_LOG_COPY.stillRunning
          : SCRIPT_STEP_LOG_COPY.noLog
  return {
    sections,
    summaryLine: sections.length > 0 ? summaryLine(log, sections.length) : undefined,
    totalCost: formatCostUSD(costUsd),
    recording: filedAs(filed, 'recording', SCRIPT_RECORDING_LABEL),
    stoppedAt: filedAs(filed, 'screenshot', SCRIPT_STOPPED_SCREENSHOT_LABEL),
    unread: log.problems.length > 0 ? SCRIPT_STEP_LOG_COPY.unread(log.problems.length) : undefined,
    empty,
    openSection: sections.at(-1)?.key,
  }
}
