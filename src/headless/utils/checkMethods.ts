/**
 * The "what was checked" row and the verdict above it, derived once for both
 * clients. Everything here is a pure projection of the run record, the
 * verification plan and the filed evidence — no React, no I/O.
 */

import { evidenceShowsNoChange, identicalPairExplanation } from 'thefactory-tools/utils'
import type {
  ReviewEvidenceRef,
  RunVerification,
  VerificationApproachOption,
  VerificationCheckResult,
} from '../api/generated'
import {
  CHECK_METHOD_ABSENT_NOUNS,
  CHECK_METHOD_APPROACH,
  CHECK_METHOD_FILL,
  CHECK_METHOD_LABELS,
  CHECK_METHOD_NOUNS,
  IMPLEMENTED_CHECK_METHOD_ORDER,
  CHECK_METHOD_SETUP_VERBS,
  CHECK_METHOD_TAB,
  CHECK_STATE_SENTENCES,
  CHECK_STATE_TONES,
  CODE_REVIEW_DETAIL,
  CODE_REVIEW_NO_VERDICT,
  CODE_REVIEW_TAB,
  COLLAPSE_ABSENT_PAST,
  NOT_RUN_TITLE,
  PROVEN_DETAIL,
  PROVEN_TITLE,
  STORY_UNFINISHED_TITLE,
  REVIEW_TAB_LABELS,
  REVIEW_TAB_ORDER,
  SIGNOFF_VERDICT_TONES,
  SIGNOFF_VERDICT_WORDS,
  VERDICT_BEARING_METHODS,
} from './checkMethodConstants'
import type {
  CheckActionHost,
  CheckActionOffer,
  CheckCallout,
  CheckMethodAction,
  CheckMethodId,
  CheckMethodRow,
  CheckMethodState,
  ReviewTab,
  ReviewTabId,
  ReviewTabsInput,
  SignoffVerdict,
  SignoffVerdictInput,
  SignoffVerdictKey,
} from './checkMethodTypes'
import { codeReviewVerdict, isCodeReview, reportAuthor } from './reviewEvidenceView'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import { formatDurationMs } from './time'

type ApproachState = 'available' | 'unavailable' | 'missing'

/**
 * Why the project has not allowed the approach that would prove a method, or
 * `undefined` when nothing is withheld. A withheld capture is not a missing
 * one: the fix is the user's switch, not an agent's set-up — and it is
 * withheld too when the host also lacks its toolchain, which is then named
 * beside it (`absentDetail`).
 */
function withheldReason(
  approaches: readonly VerificationApproachOption[],
  id: CheckMethodId,
): string | undefined {
  const availability = approaches.find((a) => a.spec.id === CHECK_METHOD_APPROACH[id])?.availability
  if (availability?.status === 'not-allowed') return availability.reason
  return availability?.status === 'unavailable' ? availability.withheld : undefined
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Which method a verification check rolls up into. */
export function checkMethodFor(
  check: Pick<VerificationCheckResult, 'id' | 'label' | 'kind'>,
): CheckMethodId {
  if (check.kind === 'compile') return 'types'
  if (check.kind === 'tests') return 'tests'
  const text = `${check.id} ${check.label}`.toLowerCase()
  // Live/e2e UI tests run as a command, but they are NOT the build — they prove
  // the running app behaves. Route them to their own chip before the build catch-all.
  if (/playwright|cypress|\be2e\b|\bui[\s-]?tests?\b/.test(text)) return 'uitests'
  if (/\blint/.test(text)) return 'lint'
  if (/format|prettier|ktlint|spotless|\bfmt\b/.test(text)) return 'format'
  return 'build'
}

/**
 * Which method a piece of filed evidence proves; logs prove nothing by
 * themselves. A report proves what its author checked: a code review's finding
 * is the code review, and the story's final report — an account of the whole
 * run, written from its record — proves nothing on its own.
 */
export function evidenceMethodFor(
  ref: Pick<ReviewEvidenceRef, 'kind' | 'approach'>,
): CheckMethodId | undefined {
  switch (ref.kind) {
    case 'screenshot':
      return 'screens'
    case 'recording':
      return 'walkthrough'
    case 'report':
      switch (reportAuthor(ref)) {
        case 'code-review':
          return 'diff'
        case 'final-report':
          return undefined
        default:
          return 'report'
      }
    default:
      return undefined
  }
}

function approachState(
  approaches: readonly VerificationApproachOption[],
  id: string | undefined,
): ApproachState {
  if (!id) return 'missing'
  const option = approaches.find((a) => a.spec.id === id)
  if (!option || option.availability.status === 'not-applicable') return 'missing'
  return option.availability.status === 'available' ? 'available' : 'unavailable'
}

function approachHints(
  approaches: readonly VerificationApproachOption[],
  id: string | undefined,
): string | undefined {
  const option = approaches.find((a) => a.spec.id === id)
  if (!option || option.availability.status !== 'unavailable') return undefined
  return trimmedOrUndefined(option.availability.hints.join(' '))
}

/**
 * State of a command-style method that matched no check.
 *
 * Without a record nothing ran, so nothing is known. With one, a command check
 * (lint, format, a build script) exists only when the project declares it — so
 * its absence means "not set up" — while tests and the typecheck are derived
 * from the changed files and are only "not set up" when the record says no
 * check could be derived at all.
 *
 * A runnable HOST APPROACH deliberately does NOT upgrade "not set up" to "not
 * run": an approach is a capability of this machine, not a check the project
 * declared. Reading it as configuration made `build` permanently "not run"
 * wherever a compiler exists, which demoted every verdict to `partly` and meant
 * the earned `merge` could never lead.
 */
function absentRunState(
  id: CheckMethodId,
  verification: RunVerification | undefined,
): CheckMethodState {
  if (!verification) return 'unchecked'
  const reason = verification.uncheckedReason?.kind
  const derivable = id === 'tests' || id === 'types'
  if (!derivable) return 'unconfigured'
  return reason === 'nothing-declared' || reason === 'no-applicable-checks'
    ? 'unconfigured'
    : 'unchecked'
}

function evidenceState(
  id: CheckMethodId,
  captured: number,
  approaches: readonly VerificationApproachOption[],
): CheckMethodState {
  if (captured > 0) return 'passed'
  if (id === 'device') {
    const shots = approachState(approaches, CHECK_METHOD_APPROACH.screens)
    const recording = approachState(approaches, CHECK_METHOD_APPROACH.walkthrough)
    return shots === 'available' || recording === 'available' ? 'unchecked' : 'unconfigured'
  }
  // A written report needs no tooling: an agent can always produce one.
  if (id === 'report') return 'unchecked'
  return approachState(approaches, CHECK_METHOD_APPROACH[id]) === 'available'
    ? 'unchecked'
    : 'unconfigured'
}

function rollUp(checks: readonly VerificationCheckResult[]): CheckMethodState {
  if (checks.some((c) => c.status === 'failed' || c.status === 'error')) return 'failed'
  if (checks.some((c) => c.status === 'passed')) return 'passed'
  return 'unchecked'
}

/**
 * What a chip offers. A method whose proof is a finding — a code review — opens
 * it whatever it concluded: what failed is written there, and reading it is
 * the next step, not a fix asked of an agent that has not read it either.
 */
function actionFor(
  id: CheckMethodId,
  state: CheckMethodState,
  approaches: readonly VerificationApproachOption[],
  finding: ReviewTabId | undefined,
): CheckMethodAction {
  const approachId = CHECK_METHOD_APPROACH[id]
  const known = approachState(approaches, approachId) === 'missing' ? undefined : approachId
  if (finding && (state === 'passed' || state === 'failed')) {
    return { kind: 'open-proof', tab: finding }
  }
  if (state === 'passed') return { kind: 'open-proof', tab: CHECK_METHOD_TAB[id] }
  if (state === 'failed') return { kind: 'request', purpose: 'fix', approachId: known }
  if (state === 'unchecked') {
    return CHECK_METHOD_FILL[id] === 'run'
      ? { kind: 'run' }
      : { kind: 'request', purpose: 'capture', approachId: known }
  }
  const withheld = withheldReason(approaches, id)
  if (withheld !== undefined) return { kind: 'allow', reason: withheld }
  return { kind: 'request', purpose: 'setup', approachId: known }
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function evidenceDetail(id: CheckMethodId, captured: number): string {
  switch (id) {
    case 'screens':
      return `${plural(captured, 'screenshot')} captured`
    case 'walkthrough':
      return `${plural(captured, 'recording')} captured`
    case 'report':
      return captured === 1 ? 'A report was written' : `${captured} reports were written`
    default:
      return 'Driven on a device'
  }
}

/**
 * The Code review chip, read from the newest code review filed: its verdict is
 * the state. A run from before code reviews has none, and there a recorded read
 * of the diff still passes it — but once a review is filed, only its verdict
 * counts, so a read diff never passes a change the review turned back.
 */
function diffState(
  evidence: readonly ReviewEvidenceRef[],
  diffReview: { by?: string; summary?: string } | undefined,
  approaches: readonly VerificationApproachOption[],
): { state: CheckMethodState; detail: string; finding: ReviewTabId | undefined } {
  if (evidence.some(isCodeReview)) {
    const reading = codeReviewVerdict(evidence)
    if (reading.state === 'concluded') {
      const { verdict, reason } = reading.verdict
      return {
        state: verdict === 'approved' ? 'passed' : 'failed',
        detail: reason ?? CODE_REVIEW_DETAIL[verdict],
        finding: CODE_REVIEW_TAB,
      }
    }
    return { state: 'unchecked', detail: CODE_REVIEW_NO_VERDICT, finding: CODE_REVIEW_TAB }
  }
  if (!diffReview) {
    return {
      state: 'unchecked',
      detail: absentDetail('diff', 'unchecked', approaches),
      finding: undefined,
    }
  }
  return {
    state: 'passed',
    detail:
      diffReview.summary ??
      (diffReview.by === 'user' ? 'You read the change' : 'The reviewer agent read the change'),
    finding: undefined,
  }
}

function absentDetail(
  id: CheckMethodId,
  state: CheckMethodState,
  approaches: readonly VerificationApproachOption[],
): string {
  if (state === 'unchecked') {
    return CHECK_METHOD_FILL[id] === 'run'
      ? 'Configured, but never run on this branch.'
      : 'Not captured on this branch.'
  }
  const why = [
    approachHints(approaches, CHECK_METHOD_APPROACH[id]),
    withheldReason(approaches, id),
  ].filter((part): part is string => part !== undefined)
  return why.length > 0 ? why.join(' ') : `This project has no ${CHECK_METHOD_ABSENT_NOUNS[id]}.`
}

/**
 * The nine method chips, in their fixed order, each in one of four states.
 *
 * Checks roll up by method; evidence counts as proof of the method that filed
 * it; a device run is proven by any driven capture. What is offered on click
 * follows the state AND how the gap can be filled — see `CHECK_METHOD_FILL`.
 */
export function checkMethodRows(input: {
  verification: RunVerification | undefined
  approaches: readonly VerificationApproachOption[]
  evidence: readonly ReviewEvidenceRef[]
  /** Who decided the run, when anyone has. */
  verdictBy?: string
  /**
   * That somebody READ the change — what satisfies the `diff` method on a run
   * from before code reviews, which filed none.
   */
  diffReview?: { by?: string; summary?: string }
}): CheckMethodRow[] {
  const { verification, approaches, evidence } = input
  const checks = verification?.checks ?? []
  const byMethod = new Map<CheckMethodId, VerificationCheckResult[]>()
  for (const check of checks) {
    const id = checkMethodFor(check)
    byMethod.set(id, [...(byMethod.get(id) ?? []), check])
  }
  const evidenceCounts = new Map<CheckMethodId, number>()
  // A before/after pair that is PIXEL-IDENTICAL evidences nothing, so it does
  // not count toward the method it was filed against. Observed live: a pair shot
  // 23 seconds apart on one unchanged build — far too little to rebuild and
  // reinstall — was identical across 2.46 million pixels and counted as visual
  // proof of a font change. The agent's own report said the screenshots "do not
  // visually prove" it; the gate believed the filing over the sentence.
  const emptyPairs = evidence.filter(evidenceShowsNoChange).length
  for (const ref of evidence) {
    const id = evidenceMethodFor(ref)
    if (!id || evidenceShowsNoChange(ref)) continue
    evidenceCounts.set(id, (evidenceCounts.get(id) ?? 0) + 1)
  }
  const driven = (evidenceCounts.get('screens') ?? 0) + (evidenceCounts.get('walkthrough') ?? 0)

  return IMPLEMENTED_CHECK_METHOD_ORDER.map((id) => {
    const matched = byMethod.get(id) ?? []
    const captured = id === 'device' ? driven : (evidenceCounts.get(id) ?? 0)
    const isRun = CHECK_METHOD_FILL[id] === 'run'

    let state: CheckMethodState
    let detail: string
    let finding: ReviewTabId | undefined
    if (isRun) {
      state = matched.length > 0 ? rollUp(matched) : absentRunState(id, verification)
      detail =
        matched.length > 0 && state !== 'unchecked'
          ? matched
              .filter((c) => (state === 'failed' ? c.status !== 'passed' : true))
              .map((c) => c.summary)
              .filter((s) => s.trim().length > 0)
              .join(' · ')
          : absentDetail(id, state, approaches)
    } else if (id === 'diff') {
      const review = diffState(evidence, input.diffReview, approaches)
      state = review.state
      detail = review.detail
      finding = review.finding
    } else if (matched.length > 0) {
      // A method the AGENT fills but a COMMAND proves — `uitests` (live/e2e). When
      // a check ran, its result IS the state, exactly like a run-filled build check.
      // Without this the evidence branch below (which ignores `matched`) read a
      // green — or red — UI-test run as "not set up".
      state = rollUp(matched)
      detail = matched
        .filter((c) => (state === 'failed' ? c.status !== 'passed' : true))
        .map((c) => c.summary)
        .filter((s) => s.trim().length > 0)
        .join(' · ')
    } else {
      state = evidenceState(id, captured, approaches)
      detail =
        state === 'passed'
          ? evidenceDetail(id, captured)
          : id === 'screens' && emptyPairs > 0
            ? // Not "nothing was captured": something WAS, and it showed nothing.
              // Those are different problems with different fixes, and telling
              // the reviewer the first one hides the second.
              identicalPairExplanation()
            : absentDetail(id, state, approaches)
    }

    const totalMs = matched.reduce((sum, c) => sum + Math.max(0, c.durationMs), 0)
    const output = trimmedOrUndefined(
      matched
        .map((c) => c.details)
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .join('\n\n'),
    )

    return {
      id,
      label: CHECK_METHOD_LABELS[id],
      noun: CHECK_METHOD_NOUNS[id],
      setupVerb: CHECK_METHOD_SETUP_VERBS[id],
      state,
      tone: CHECK_STATE_TONES[state],
      detail,
      durationLabel: matched.length > 0 ? trimmedOrUndefined(formatDurationMs(totalMs)) : undefined,
      output,
      fill: CHECK_METHOD_FILL[id],
      action: actionFor(id, state, approaches, finding),
      checkIds: matched.map((c) => c.id),
    }
  })
}

/** The rows' labels as a sentence names them: "Tests, Types and Build". */
export function joinNames(rows: readonly Pick<CheckMethodRow, 'label'>[]): string {
  const names = rows.map((r) => r.label)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The headline. Failure wins; then "nothing at all was checked"; then any
 * verdict-bearing method that could have run and did not demotes to partly;
 * otherwise proven. A method the project never had cannot be held against the
 * run — it is shown, but it does not demote.
 *
 * A FAILURE counts from ANY implemented method, optional or not: OPTIONAL means
 * "its ABSENCE never demotes" (a change needing no UI test is not "partly"), NOT
 * "its failure is forgiven". A red UI-test chip must never sit under "proven".
 */
export function signoffVerdict(input: SignoffVerdictInput): SignoffVerdict {
  const bearing = input.rows.filter((r) => VERDICT_BEARING_METHODS.includes(r.id))
  // Failure is read across every row, not just verdict-bearing ones — an optional
  // method (uitests) is the first that can actually reach `failed`, and swallowing
  // that would print "Every configured check passed" above a red chip.
  const failed = input.rows.filter((r) => r.state === 'failed')
  const passed = bearing.filter((r) => r.state === 'passed')
  const unchecked = bearing.filter((r) => r.state === 'unchecked')

  let key: SignoffVerdictKey
  let title: string
  let detail: string
  if (failed.length > 0) {
    key = 'failed'
    title = failed.length === 1 ? `${failed[0].label} failed` : `${failed.length} checks failed`
    detail = failed.map((r) => r.detail).join(' · ')
  } else if (!input.verified && passed.length === 0) {
    key = 'not-run'
    title = NOT_RUN_TITLE
    detail = NOT_VERIFIED_DETAIL
  } else if (unchecked.length > 0) {
    key = 'partly'
    title = `Passes what ran — ${joinNames(unchecked)} never ran`
    detail = passed.length > 0 ? `${joinNames(passed)} passed.` : 'Nothing that ran failed.'
  } else if (passed.length === 0) {
    // Every verdict-bearing method is `unconfigured`: nothing was checked at all.
    // "Nothing to hold against the run" is not the same as proven, and saying
    // proven here would promote `merge` on a run with no evidence whatsoever.
    key = 'not-run'
    title = NOT_RUN_TITLE
    detail = NOT_VERIFIED_DETAIL
  } else if (input.storyIncomplete) {
    // The checks pass, but the STORY is not finished. `proven` here would print
    // "Nothing outstanding" directly above the count of what is outstanding.
    key = 'partly'
    title = STORY_UNFINISHED_TITLE
    detail = input.storyIncomplete
  } else {
    key = 'proven'
    title = PROVEN_TITLE
    detail = PROVEN_DETAIL
  }
  return {
    key,
    tone: SIGNOFF_VERDICT_TONES[key],
    word: SIGNOFF_VERDICT_WORDS[key],
    hollow: key === 'partly' || key === 'not-run',
    title,
    detail,
  }
}

/**
 * Which tabs the panel offers. Every tab exists only when it has something in
 * it — an empty gallery is a lie about the run, and an empty Tests/Build tab
 * that only ever said "this project has no ___" duplicated what the chip row
 * already shows. The way to ask for a missing check lives on the chip, so the
 * code-check tabs no longer need to stand in for absent ones.
 */
export function reviewTabs(input: ReviewTabsInput): ReviewTab[] {
  // Only Screens, Tests and Changes carry a count. Walkthrough, Build and Report
  // deliberately carry none: their tabs already exist only when there is
  // something in them, so a badge would restate the tab's own presence.
  const counts: Record<ReviewTabId, number | undefined> = {
    screens: input.screensProof ?? input.screens,
    walkthrough: undefined,
    tests: input.testCount > 0 ? input.testCount : undefined,
    build: undefined,
    report: undefined,
    'code-review': undefined,
    changes: input.changedFiles,
  }
  const present: Record<ReviewTabId, boolean> = {
    screens: input.screens > 0,
    walkthrough: input.walkthroughs > 0,
    tests: input.testChecks > 0,
    build: input.buildChecks > 0,
    report: input.reports > 0,
    'code-review': (input.codeReviews ?? 0) > 0,
    changes: input.changedFiles !== undefined,
  }
  return reviewTabOrder(input.lead)
    .filter((id) => present[id])
    .map((id) => ({
      id,
      label: REVIEW_TAB_LABELS[id],
      count: counts[id],
    }))
}

export type CheckRowLayout = {
  /** Rows to render as chips, checked methods first. */
  visible: CheckMethodRow[]
  /** Absent rows folded behind a single "N not checked" chip; empty when not folded. */
  collapsed: CheckMethodRow[]
}

/**
 * What a chip's callout says, on every client. A capture the project has not
 * allowed leads with where the user allows it — "there is no screenshot in this
 * project, ask for it here" would send them to an agent that cannot turn it on.
 */
export function checkCallout(row: CheckMethodRow): CheckCallout {
  if (row.action.kind === 'allow') return { lead: row.action.reason, detail: undefined }
  const lead =
    row.state === 'unconfigured'
      ? `There is no ${row.noun} in this project, so there is no tab for it. Ask for it here.`
      : CHECK_STATE_SENTENCES[row.state]
  return { lead, detail: row.state !== 'passed' && row.detail ? row.detail : undefined }
}

/**
 * The control a chip or check block shows for its action on `host`, on every
 * client. A capture is produced by a verifier the host spawns, so it needs no
 * chat; a fix or a set-up is an instruction to the agent in this chat, so
 * without one it is shown disabled, with why. With no host — a read-only record
 * — only the proof is offered: a button there would do nothing when pressed.
 */
export function checkActionOffer(
  action: CheckMethodAction,
  host: Pick<CheckActionHost, 'canRequest'> | undefined,
): CheckActionOffer {
  if (action.kind === 'open-proof') return { kind: 'open-proof', tab: action.tab }
  if (action.kind === 'allow' || !host) return { kind: 'none' }
  if (action.kind === 'run') return { kind: 'run' }
  return {
    kind: 'request',
    purpose: action.purpose,
    unreachable: action.purpose !== 'capture' && !host.canRequest,
  }
}

/**
 * The chips in the order of the tabs below them — `tabOrder`, lead tab first —
 * each placed by the tab it opens, or where its method's proof would live; past
 * a few absent ones the rest fold into one chip, so the common case — most
 * things not checked — is not a wall of dashes.
 */
export function checkRowLayout(
  rows: readonly CheckMethodRow[],
  expanded: boolean,
  tabOrder?: readonly ReviewTabId[],
): CheckRowLayout {
  const ordered = tabOrder ? inTabOrder(rows, tabOrder) : [...rows]
  const absent = ordered.filter((r) => r.state === 'unchecked' || r.state === 'unconfigured')
  if (expanded || absent.length <= COLLAPSE_ABSENT_PAST) return { visible: ordered, collapsed: [] }
  return { visible: ordered.filter((r) => !absent.includes(r)), collapsed: absent }
}

/** The tab a chip belongs beside: the one it opens, else where its method's proof lives. */
function chipTab(row: CheckMethodRow): ReviewTabId {
  return row.action?.kind === 'open-proof' ? row.action.tab : CHECK_METHOD_TAB[row.id]
}

/** Rows sorted by their tab's place in `tabOrder`, a tab not shown last; stable otherwise. */
function inTabOrder(
  rows: readonly CheckMethodRow[],
  tabOrder: readonly ReviewTabId[],
): CheckMethodRow[] {
  const rank = (row: CheckMethodRow) => {
    const at = tabOrder.indexOf(chipTab(row))
    return at === -1 ? tabOrder.length : at
  }
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index)
    .map(({ row }) => row)
}

/** The order tabs are drawn in — and the chips above them — a lead tab first. */
export function reviewTabOrder(lead?: ReviewTabId): ReviewTabId[] {
  return lead === undefined
    ? [...REVIEW_TAB_ORDER]
    : [lead, ...REVIEW_TAB_ORDER.filter((id) => id !== lead)]
}

/** Ids of the methods whose proof a tab shows — for the popover's "open the proof" jump. */
export function tabForMethod(id: CheckMethodId): ReviewTabId {
  return CHECK_METHOD_TAB[id]
}
