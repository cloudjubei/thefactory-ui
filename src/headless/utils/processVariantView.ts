import type { ProcessPlanStep, ProcessRun } from 'thefactory-tools/types'
import { isWalkthroughProof, processStepStates } from 'thefactory-tools/utils'

import { SIGNOFF_VERDICT_TONES, SIGNOFF_VERDICT_WORDS } from './checkMethodConstants'
import type { SignoffVerdict } from './checkMethodTypes'
import { processLaunchShortRef } from './processLaunchForm'
import {
  PROCESS_VARIANT_BADGE,
  PROCESS_VARIANT_COPY,
  PROCESS_VARIANT_DAYS_INPUT,
  PROCESS_VARIANT_DAYS_PATTERN,
  PROCESS_VARIANT_POST_PATTERN,
  PROCESS_VARIANT_WEEK_DAYS,
  PROCESS_VARIANT_WEEK_PATTERN,
} from './processVariantViewConstants'
import type {
  ProcessRunEvidenceGroupView,
  ProcessVariantDayCell,
  ProcessVariantFact,
  ProcessVariantFindings,
  ProcessVariantLane,
  ProcessVariantLaneStatus,
  ProcessVariantLanesView,
  ProcessVariantRecording,
  ProcessVariantReportView,
  ProcessVariantReviewLook,
  ProcessVariantRunView,
  ProcessVariantSection,
  ProcessVariantWeek,
} from './processVariantViewTypes'
import {
  formatProcessDuration,
  processRunSpend,
  processRunWorkMs,
  processStepCostLabel,
  processStepWorkMs,
} from './processView'
import { reportAuthor } from './reviewEvidenceView'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import { reportBodyView } from './signoffReport'
import { REPORT_PROOF_MARK, REPORT_TILE_LABELS } from './signoffReportConstants'
import type { ReportProofRow, ReportTile } from './signoffReportTypes'
import { plainMarkdownLine } from './textLine'

type VariantStep = ProcessPlanStep & { fanOut: string }

/** The steps of a run that fan out over variants, in plan order. Pure. */
export function processVariantSteps(run: Pick<ProcessRun, 'plan'>): VariantStep[] {
  return run.plan.steps.filter(
    (step): step is VariantStep => step.fanOut !== undefined && step.subject?.kind === 'variant',
  )
}

/** Whether a run works variants side by side. Pure. */
export function isProcessVariantRun(run: Pick<ProcessRun, 'plan'>): boolean {
  return processVariantSteps(run).length > 0
}

/** Whether a step is one of the steps a run's lanes show in its place. Pure. */
export function isProcessVariantStep(step: Pick<ProcessPlanStep, 'fanOut'>): boolean {
  return step.fanOut !== undefined
}

/** What a variants heading is called: the input they came from. Pure. */
export function processVariantHeading(run: Pick<ProcessRun, 'plan'>): string {
  const subject = processVariantSteps(run)[0]?.subject
  const input =
    subject?.kind === 'variant'
      ? run.plan.inputs?.find((item) => item.name === subject.input)
      : undefined
  return input?.label ?? PROCESS_VARIANT_COPY.heading
}

function launchDays(run: Pick<ProcessRun, 'input' | 'plan'>): number | undefined {
  const declared = run.plan.inputs?.find(
    (input) => input.name === PROCESS_VARIANT_DAYS_INPUT && input.kind === 'number',
  )
  const values = (run.input as { inputValues?: Record<string, unknown> } | undefined)?.inputValues
  const days = declared ? values?.[declared.name] : undefined
  return typeof days === 'number' && Number.isFinite(days) && days > 0
    ? Math.floor(days)
    : undefined
}

/** The last day a label names, `Day 3` or `Days 1–7`. Pure. */
export function processVariantDayOf(label: string | undefined): number | undefined {
  const match = label ? PROCESS_VARIANT_DAYS_PATTERN.exec(label) : null
  if (!match) return undefined
  return Number(match[2] ?? match[1])
}

const byFiling = (a: EvidenceTile, b: EvidenceTile) => a.ref.createdAt - b.ref.createdAt

function recordingsOf(group: ProcessRunEvidenceGroupView | undefined): EvidenceTile[] {
  return (group?.tiles ?? []).filter((tile) => tile.ref.kind === 'recording').sort(byFiling)
}

function reviewsOf(group: ProcessRunEvidenceGroupView | undefined): EvidenceTile[] {
  return (group?.tiles ?? [])
    .filter((tile) => tile.ref.kind === 'report' && reportAuthor(tile.ref) !== 'code-review')
    .sort(byFiling)
}

/** How far a variant got: the last day its recordings name, else one a recording. Pure. */
function livedDays(recordings: readonly EvidenceTile[]): number {
  const named = recordings.flatMap((tile) => processVariantDayOf(tile.ref.label) ?? [])
  return named.length > 0 ? Math.max(...named) : recordings.length
}

function laneStatus(
  group: ProcessRunEvidenceGroupView | undefined,
  entered: boolean,
): ProcessVariantLaneStatus {
  switch (group?.status) {
    case 'running':
      return 'running'
    case 'pending':
      return entered ? 'running' : 'queued'
    case 'parked':
      return 'parked'
    case 'succeeded':
      return 'done'
    case 'failed':
    case 'cancelled':
      return 'stopped'
    default:
      return entered ? 'running' : 'queued'
  }
}

function dayCells(
  days: number,
  lived: number,
  status: ProcessVariantLaneStatus,
): ProcessVariantDayCell[] {
  return Array.from({ length: days }, (_, at) => {
    const day = at + 1
    if (day <= lived) return { day, look: 'lived' as const }
    if (day === lived + 1 && status === 'parked') return { day, look: 'parked' as const }
    if (day === lived + 1 && status === 'running') return { day, look: 'today' as const }
    return { day, look: 'to-come' as const }
  })
}

function reviewedWeeks(reviews: readonly EvidenceTile[]): Set<number> {
  return new Set(
    reviews.flatMap((tile) => {
      const match = PROCESS_VARIANT_WEEK_PATTERN.exec(tile.ref.label ?? '')
      return match ? [Number(match[1])] : []
    }),
  )
}

function lastReview(
  reviews: readonly EvidenceTile[],
  status: ProcessVariantLaneStatus,
  lived: number,
  days: number,
): ProcessVariantReviewLook {
  if (status === 'done' || reviews.length > 0) return 'done'
  return status === 'running' && lived >= days ? 'now' : 'wait'
}

function weeksOf(
  days: number,
  cells: readonly ProcessVariantDayCell[],
  reviews: readonly EvidenceTile[],
  status: ProcessVariantLaneStatus,
  lived: number,
): ProcessVariantWeek[] {
  const named = reviewedWeeks(reviews)
  const count = Math.ceil(days / PROCESS_VARIANT_WEEK_DAYS)
  const ending = lastReview(reviews, status, lived, days)
  const reviewOf = (week: number): ProcessVariantReviewLook | undefined => {
    if (named.has(week)) return 'done'
    if (named.size > 0) return status === 'done' ? 'done' : 'wait'
    return week === count ? ending : undefined
  }
  return Array.from({ length: count }, (_, at) => ({
    label: PROCESS_VARIANT_COPY.week(at + 1),
    cells: cells.slice(at * PROCESS_VARIANT_WEEK_DAYS, (at + 1) * PROCESS_VARIANT_WEEK_DAYS),
    review: reviewOf(at + 1),
  }))
}

function factsOf(values: Readonly<Record<string, unknown>> | undefined): ProcessVariantFact[] {
  return Object.values(values ?? {}).flatMap((value) => {
    if (!Array.isArray(value)) return []
    return value.flatMap((entry: { ref?: unknown; patch?: unknown; role?: unknown }, at) => {
      if (typeof entry?.ref !== 'string') return []
      const key = `${String(entry.role ?? '')}:${at}`
      return [
        { key: `ref:${key}`, kind: 'ref' as const, text: processLaunchShortRef(entry.ref) },
        ...(typeof entry.patch === 'string' && entry.patch
          ? [{ key: `patch:${key}`, kind: 'patch' as const, text: PROCESS_VARIANT_COPY.patchChip }]
          : []),
      ]
    })
  })
}

function firstLine(text: string | undefined): string | undefined {
  const line = text
    ?.split('\n')
    .map((one) => one.trim())
    .find((one) => one !== '' && !one.startsWith('#'))
  return line ? plainMarkdownLine(line) : undefined
}

function laneLine(
  status: ProcessVariantLaneStatus,
  recordings: readonly EvidenceTile[],
  reviews: readonly EvidenceTile[],
  summary: string | undefined,
  parkMessage: string | undefined,
  reviewing: boolean,
): string {
  if (status === 'queued') return PROCESS_VARIANT_COPY.queued
  if (status === 'parked') return parkMessage ?? PROCESS_VARIANT_COPY.needsYou
  if (status === 'stopped') return summary ?? PROCESS_VARIANT_COPY.stopped
  if (status === 'done') {
    return summary ?? firstLine(reviews.at(-1)?.text) ?? PROCESS_VARIANT_COPY.finished
  }
  if (reviewing) return PROCESS_VARIANT_COPY.reviewing
  return recordings.at(-1)?.caption ?? PROCESS_VARIANT_COPY.starting
}

function dayLineOf(
  days: number | undefined,
  lived: number,
  status: ProcessVariantLaneStatus,
): string | undefined {
  if (days === undefined) return undefined
  const day =
    status === 'done' ? days : status === 'queued' ? 1 : Math.min(days, Math.max(lived + 1, 1))
  return PROCESS_VARIANT_COPY.dayOf(day, days)
}

function walkthroughChip(
  proof: { count: number; total: number },
  status: ProcessVariantLaneStatus,
): ProcessVariantLane['chip'] {
  const whole = proof.total > 0 && proof.count === proof.total
  return {
    label: `${PROCESS_VARIANT_COPY.walkthrough} · ${PROCESS_VARIANT_COPY.ofTotal(proof.count, proof.total)}`,
    state: whole ? 'passed' : status === 'parked' ? 'flagged' : 'unchecked',
  }
}

function liveGroupFor(
  groups: readonly ProcessRunEvidenceGroupView[],
  stepId: string,
): ProcessRunEvidenceGroupView | undefined {
  const own = groups.filter((group) => group.stepId === stepId)
  return own.find((group) => !group.replaced) ?? own.at(-1)
}

/**
 * A lane per variant of a run: how far each got, in a cell per day when the
 * launch says how many, read from what each has filed. A run nested under a
 * variant files under that variant's run. Pure.
 */
export function processVariantLanes(
  run: ProcessRun,
  groups: readonly ProcessRunEvidenceGroupView[],
  now: number,
): ProcessVariantLanesView {
  const days = launchDays(run)
  const states = processStepStates(run)
  const steps = processVariantSteps(run)
  const lanes = steps.map((step): ProcessVariantLane => {
    const state = states.find((one) => one.step.id === step.id)
    const group = liveGroupFor(groups, step.id)
    const recordings = recordingsOf(group)
    const reviews = reviewsOf(group)
    const status = laneStatus(group, (state?.entries.length ?? 0) > 0)
    const filed = livedDays(recordings)
    const lived = status === 'done' && days !== undefined ? days : Math.min(filed, days ?? filed)
    const cells = days !== undefined ? dayCells(days, lived, status) : []
    const weeks = days !== undefined ? weeksOf(days, cells, reviews, status, lived) : []
    const workMs = state ? processStepWorkMs(run, state, now) : undefined
    const subject = step.subject?.kind === 'variant' ? step.subject : undefined
    const parkMessage = group && run.park?.childRunId === group.runId ? run.park.message : undefined
    const proof = {
      count: recordings.filter((tile) => isWalkthroughProof(tile.ref)).length,
      total: recordings.length,
    }
    return {
      id: subject?.id ?? step.id,
      label: subject?.title ?? step.name,
      stepId: step.id,
      runId: group?.runId ?? state?.latest?.childRunId,
      status,
      badge: PROCESS_VARIANT_BADGE[status],
      line: laneLine(
        status,
        recordings,
        reviews,
        state?.latest?.summary?.trim() || undefined,
        parkMessage,
        status === 'running' && days !== undefined && lived >= days,
      ),
      dayLine: dayLineOf(days, lived, status),
      lived,
      weeks,
      time: workMs !== undefined && workMs > 0 ? formatProcessDuration(workMs) : undefined,
      cost: processStepCostLabel(run, step.id),
      facts: factsOf(subject?.values),
      proof,
      chip: walkthroughChip(proof, status),
    }
  })
  return {
    heading: processVariantHeading(run),
    sub: PROCESS_VARIANT_COPY.atOnce(lanes.length),
    days,
    weekLabels: lanes[0]?.weeks.map((week) => week.label) ?? [],
    lanes,
    ended: lanes.filter((lane) => lane.status === 'done' || lane.status === 'stopped').length,
  }
}

function recordingView(tile: EvidenceTile): ProcessVariantRecording {
  const proof = isWalkthroughProof(tile.ref)
  const day = processVariantDayOf(tile.ref.label)
  return {
    tile,
    proof,
    label: proof
      ? day !== undefined
        ? PROCESS_VARIANT_COPY.proofReached(day)
        : PROCESS_VARIANT_COPY.proof
      : PROCESS_VARIANT_COPY.notProof,
    title: proof ? PROCESS_VARIANT_COPY.proofTitle : (tile.ref.unvouchedReason ?? ''),
  }
}

function findingsOf(reviews: readonly EvidenceTile[]): ProcessVariantFindings[] {
  return reviews.map((tile) => ({
    key: tile.ref.id,
    title: tile.ref.label?.trim() || PROCESS_VARIANT_COPY.review,
    text: tile.text,
  }))
}

function findingsNote(
  lane: ProcessVariantLane,
  reviews: readonly EvidenceTile[],
): string | undefined {
  if (reviews.length > 0) return undefined
  if (lane.status === 'stopped' || lane.status === 'done') return undefined
  return lane.line === PROCESS_VARIANT_COPY.reviewing
    ? PROCESS_VARIANT_COPY.reviewSoon
    : PROCESS_VARIANT_COPY.reviewLater
}

function sectionOf(
  lane: ProcessVariantLane,
  group: ProcessRunEvidenceGroupView | undefined,
  days: number | undefined,
): ProcessVariantSection {
  const reviews = reviewsOf(group)
  return {
    lane,
    recordings: recordingsOf(group).map(recordingView),
    recordingNow: lane.status === 'running' && (days === undefined || lane.lived < days),
    findings: findingsOf(reviews),
    findingsNote: findingsNote(lane, reviews),
  }
}

function isPost(tile: EvidenceTile): boolean {
  return PROCESS_VARIANT_POST_PATTERN.test(tile.ref.label ?? '')
}

function proofRow(lane: ProcessVariantLane): ReportProofRow {
  const { count, total } = lane.proof
  const status = total > 0 && count === total ? 'proven' : 'unproven'
  return {
    key: lane.id,
    text: PROCESS_VARIANT_COPY.provenLine(lane.label, count, total),
    status,
    mark: REPORT_PROOF_MARK[status],
    tone: status === 'proven' ? 'done' : 'review',
    tab: undefined,
    tabLabel: undefined,
  }
}

function tilesOf(
  run: ProcessRun,
  lanes: ProcessVariantLanesView,
  proof: { count: number; total: number },
  allEnded: boolean,
  now: number,
): ReportTile[] {
  const whole = proof.total > 0 && proof.count === proof.total
  const workMs = processRunWorkMs(run, now)
  return [
    {
      key: 'asked',
      label: REPORT_TILE_LABELS.asked,
      value: PROCESS_VARIANT_COPY.asked(lanes.lanes.length),
      sub: lanes.days !== undefined ? PROCESS_VARIANT_COPY.daysEach(lanes.days) : undefined,
      tone: 'neutral',
    },
    {
      key: 'delivered',
      label: REPORT_TILE_LABELS.proven,
      value: PROCESS_VARIANT_COPY.provenTile(proof.count, proof.total),
      sub: !allEnded
        ? PROCESS_VARIANT_COPY.provenSoFar
        : whole
          ? PROCESS_VARIANT_COPY.provenWhole
          : PROCESS_VARIANT_COPY.provenShort(proof.total - proof.count),
      tone: whole ? 'done' : 'working',
    },
    {
      key: 'time',
      label: REPORT_TILE_LABELS.time,
      value: workMs !== undefined ? formatProcessDuration(workMs) : '—',
      sub: undefined,
      tone: 'neutral',
    },
    {
      key: 'cost',
      label: REPORT_TILE_LABELS.cost,
      value: processRunSpend(run)?.label ?? '—',
      sub: undefined,
      tone: 'neutral',
    },
  ]
}

function verdictOf(proof: { count: number; total: number }): SignoffVerdict {
  const key = proof.total === 0 ? 'not-run' : proof.count === proof.total ? 'proven' : 'partly'
  const title = PROCESS_VARIANT_COPY.provenSummary(proof.count, proof.total)
  return {
    key,
    tone: SIGNOFF_VERDICT_TONES[key],
    word: SIGNOFF_VERDICT_WORDS[key],
    hollow: proof.total === 0,
    title,
    detail: title,
  }
}

/**
 * A run's report from what its tree filed, with no story: the final report and
 * the post beside it, a section per variant, and every other recording the run
 * filed, whatever step filed it. Only a recording the backend still vouches for
 * counts as proof. Pure.
 */
export function processVariantReport(
  run: ProcessRun,
  groups: readonly ProcessRunEvidenceGroupView[],
  now: number,
): ProcessVariantReportView {
  const lanes = processVariantLanes(run, groups, now)
  const root = groups.find((group) => group.runId === run.id)
  const inLanes = new Set(lanes.lanes.flatMap((lane) => lane.runId ?? []))
  const rest = groups.filter((group) => !group.replaced && !inLanes.has(group.runId))
  const sections = lanes.lanes.map((lane) =>
    sectionOf(lane, liveGroupFor(groups, lane.stepId), lanes.days),
  )
  const recordings = rest.flatMap((group) => recordingsOf(group).map(recordingView))
  const filed = reviewsOf(root)
  const post = filed.filter(isPost).at(-1)
  const reportTile = filed.filter((tile) => !isPost(tile)).at(-1)
  const proofRows = lanes.lanes.filter((lane) => lane.proof.total > 0).map(proofRow)
  const proof = [...sections.flatMap((s) => s.recordings), ...recordings].reduce(
    (sum, one) => ({ count: sum.count + (one.proof ? 1 : 0), total: sum.total + 1 }),
    { count: 0, total: 0 },
  )
  const body = reportTile ? reportBodyView(reportTile, [], proofRows) : undefined
  const left = lanes.lanes.length - lanes.ended
  const tiles = tilesOf(run, lanes, proof, left === 0, now)
  const summary = PROCESS_VARIANT_COPY.provenSummary(proof.count, proof.total)
  return {
    report: body
      ? {
          ...body,
          tiles,
          ...(body.howProven ? { howProven: { ...body.howProven, summary } } : {}),
        }
      : undefined,
    reportTile,
    post,
    waiting: reportTile
      ? undefined
      : left > 0
        ? {
            sub: PROCESS_VARIANT_COPY.finalWaiting(left, lanes.lanes.length),
            line: `${PROCESS_VARIANT_COPY.finalComes} ${PROCESS_VARIANT_COPY.finalSoFar}`,
          }
        : { sub: '', line: PROCESS_VARIANT_COPY.noFinalReport },
    tiles,
    proofRows,
    proof,
    sections,
    recordings,
    headline: body?.outcome?.body.headline ?? run.title,
    verdict: verdictOf(proof),
    tally: proof.total > 0 ? { label: `${proof.count}/${proof.total}`, title: summary } : undefined,
  }
}

/** Which view a run of variants opens on: the lanes while it works, the report once it is decided on. Pure. */
export function processVariantRunView(
  run: Pick<ProcessRun, 'status'>,
  atSignOff: boolean,
  picked: ProcessVariantRunView | undefined,
): ProcessVariantRunView {
  if (picked) return picked
  return atSignOff || run.status === 'succeeded' ? 'report' : 'lanes'
}

/** Whether a run ended with its report accepted and nothing merged. Pure. */
export function isProcessReportAccepted(
  run: Pick<ProcessRun, 'status' | 'integration' | 'plan'>,
): boolean {
  if (run.status !== 'succeeded' || !isProcessVariantRun(run)) return false
  return run.integration === undefined || run.integration.status === 'already-landed'
}

/** What the step after a run's variants says while it waits for them. Pure. */
export function processVariantJoinLine(lanes: ProcessVariantLanesView): string {
  return lanes.ended === 0
    ? PROCESS_VARIANT_COPY.joinsAll(lanes.lanes.length)
    : PROCESS_VARIANT_COPY.joinsRest
}
