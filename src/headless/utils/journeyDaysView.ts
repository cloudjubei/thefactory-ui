import type {
  JourneyDayLog,
  JourneyDayLogEntry,
  JourneyLoggedGoal,
  ProcessLedgerEntry,
} from 'thefactory-tools/types'
import {
  JOURNEY_DAY_LOG_LABEL,
  JOURNEY_RECORDING_LABEL,
  JOURNEY_STOPPED_SCREENSHOT_LABEL,
} from 'thefactory-tools/constants'
import { parseJourneyDayLog } from 'thefactory-tools/utils'

import { formatCostUSD } from './costDetails'
import {
  JOURNEY_DAYS_COPY,
  JOURNEY_DECISION_LABELS,
  JOURNEY_SOURCE_BADGES,
  JOURNEY_STATUS_BADGES,
  JOURNEY_TAKE_OVER_BADGES,
} from './journeyDaysViewConstants'
import type { JourneyDayView, JourneyStepView } from './journeyDaysViewTypes'
import { stepFilingsOf } from './processStepRow'
import type { EvidenceTile } from './reviewEvidenceViewTypes'

type EntryOf<K extends JourneyDayLogEntry['kind']> = Extract<JourneyDayLogEntry, { kind: K }>

const ofKind = <K extends JourneyDayLogEntry['kind']>(
  lines: readonly JourneyDayLogEntry[],
  kind: K,
): EntryOf<K>[] => lines.filter((line): line is EntryOf<K> => line.kind === kind)

const goalText = (goal: JourneyLoggedGoal): string => goal.text

const addCost = (sum: number | undefined, cost: number | undefined): number | undefined =>
  cost === undefined || !Number.isFinite(cost) ? sum : (sum ?? 0) + cost

function journalLine(lines: readonly JourneyDayLogEntry[]): string | undefined {
  const last = ofKind(lines, 'journal').at(-1)
  if (!last) return undefined
  return last.wrote ? JOURNEY_DAYS_COPY.wrote(last.text?.trim()) : JOURNEY_DAYS_COPY.wroteNothing
}

function dayLine(decisions: number, live: number, takeOvers: number): string {
  return [
    JOURNEY_DAYS_COPY.decisions(decisions),
    ...(live > 0 ? [JOURNEY_DAYS_COPY.live(live)] : []),
    ...(takeOvers > 0 ? [JOURNEY_DAYS_COPY.takeOvers(takeOvers)] : []),
  ].join(' · ')
}

function dayOf(day: number, lines: readonly JourneyDayLogEntry[]): JourneyDayView {
  const decisions = ofKind(lines, 'decision')
  const takeOvers = ofKind(lines, 'take-over')
  const costUsd = [...decisions, ...takeOvers].reduce<number | undefined>(
    (sum, line) => addCost(sum, line.costUsd),
    undefined,
  )
  const live = decisions.filter((line) => line.source === 'live').length
  const worst = takeOvers.find((line) => line.outcome === 'failed') ?? takeOvers[0]
  return {
    day,
    title: JOURNEY_DAYS_COPY.day(day),
    line: dayLine(decisions.length, live, takeOvers.length),
    offered: ofKind(lines, 'goals-offered').flatMap((line) => line.goals.map(goalText)),
    removed: ofKind(lines, 'goal-removed').map((line, at) => ({
      key: `removed-${at}`,
      goal: line.goal,
      reason: line.reason,
    })),
    replaced: ofKind(lines, 'goal-replaced').map((line, at) => ({
      key: `replaced-${at}`,
      from: line.from,
      to: line.to,
      reason: line.reason,
    })),
    accepted: ofKind(lines, 'goals-accepted').flatMap((line) => (line.goals ?? []).map(goalText)),
    statuses: ofKind(lines, 'goal-status').map((line, at) => ({
      key: `status-${at}`,
      goal: line.goal,
      status: JOURNEY_STATUS_BADGES[line.status] ?? { label: line.status, tone: 'empty' },
    })),
    journal: journalLine(lines),
    probes: ofKind(lines, 'probe').map((line, at) => ({
      key: `probe-${at}`,
      question: line.question,
      choice: line.choice,
      note: line.note,
    })),
    cards: ofKind(lines, 'card').map((line, at) => ({
      key: `card-${at}`,
      card: line.card,
      reaction: line.reaction,
    })),
    decisions: decisions.map((line, at) => ({
      key: `decision-${at}`,
      kind: line.decision,
      label: JOURNEY_DECISION_LABELS[line.decision],
      source: line.source,
      badge: JOURNEY_SOURCE_BADGES[line.source],
      model: line.model,
      cost: formatCostUSD(line.costUsd),
    })),
    takeOvers: takeOvers.map((line, at) => ({
      key: `take-over-${at}`,
      goal: line.goal,
      saw: line.saw,
      outcome: line.outcome,
      badge: JOURNEY_TAKE_OVER_BADGES[line.outcome],
      turns: line.turns === undefined ? undefined : JOURNEY_DAYS_COPY.turns(line.turns),
      cost: formatCostUSD(line.costUsd),
    })),
    takeOverBadge: worst ? JOURNEY_TAKE_OVER_BADGES[worst.outcome] : undefined,
    costUsd,
    cost: formatCostUSD(costUsd),
  }
}

/**
 * A day log as days: each day once, in order, with what it offered, what was
 * removed, replaced and accepted, the statuses, journal, evening question and
 * cards, each decision by where its answer came from, every take-over by how
 * it ended, and what the day cost. Pure.
 */
export function journeyDays(log: JourneyDayLog): JourneyDayView[] {
  const byDay = new Map<number, JourneyDayLogEntry[]>()
  for (const line of log.entries) {
    const held = byDay.get(line.day)
    if (held) held.push(line)
    else byDay.set(line.day, [line])
  }
  return [...byDay.entries()].sort(([a], [b]) => a - b).map(([day, lines]) => dayOf(day, lines))
}

const filedAs = (
  tiles: readonly EvidenceTile[],
  kind: EvidenceTile['ref']['kind'],
  label: string,
): EvidenceTile | undefined =>
  tiles.find((tile) => tile.ref.kind === kind && tile.ref.label === label)

function totalLine(days: readonly JourneyDayView[]): string {
  const decisions = days.flatMap((day) => day.decisions)
  const live = decisions.filter((one) => one.source === 'live').length
  const takeOvers = days.reduce((sum, day) => sum + day.takeOvers.length, 0)
  return [
    JOURNEY_DAYS_COPY.days(days.length),
    [
      JOURNEY_DAYS_COPY.decisions(decisions.length),
      ...(live > 0 ? [JOURNEY_DAYS_COPY.live(live)] : []),
    ].join(', '),
    ...(takeOvers > 0 ? [JOURNEY_DAYS_COPY.takeOvers(takeOvers)] : []),
  ].join(' · ')
}

/**
 * What a script step's attempt shows, from what its run filed: the days of
 * its day log, the recording of them and, when the script stopped short, the
 * screenshot of where. `tiles` are the run's filings, the day log's text read.
 * Pure.
 */
export function journeyStepView(
  tiles: readonly EvidenceTile[],
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt' | 'status'> | undefined,
): JourneyStepView {
  const filed = stepFilingsOf(tiles, entry)
  const logTile = filedAs(filed, 'log', JOURNEY_DAY_LOG_LABEL)
  const log = parseJourneyDayLog(logTile?.text ?? '')
  const days = journeyDays(log)
  const costUsd = days.reduce<number | undefined>(
    (sum, day) => addCost(sum, day.costUsd),
    undefined,
  )
  const empty =
    days.length > 0 || log.problems.length > 0
      ? undefined
      : logTile
        ? JOURNEY_DAYS_COPY.logUnreadable
        : entry?.status === 'running'
          ? JOURNEY_DAYS_COPY.stillLiving
          : JOURNEY_DAYS_COPY.noLog
  return {
    days,
    totalLine: days.length > 0 ? totalLine(days) : undefined,
    totalCost: formatCostUSD(costUsd),
    recording: filedAs(filed, 'recording', JOURNEY_RECORDING_LABEL),
    stoppedAt: filedAs(filed, 'screenshot', JOURNEY_STOPPED_SCREENSHOT_LABEL),
    unread: log.problems.length > 0 ? JOURNEY_DAYS_COPY.unread(log.problems.length) : undefined,
    empty,
    openDay: days.at(-1)?.day,
  }
}
