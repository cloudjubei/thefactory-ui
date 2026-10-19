/**
 * The "what was checked" row and the verdict above it, derived once for both
 * clients. Everything here is a pure projection of the run record, the
 * verification plan and the filed evidence — no React, no I/O.
 */

import {
  evidenceShowsNoChange,
  identicalPairExplanation,
  projectCheckRanInOf,
} from 'thefactory-tools/utils'
import type {
  ProjectCheckRunMemory,
  ProjectChecksListing,
  ReviewEvidenceRef,
  RunVerification,
  VerificationApproachOption,
  VerificationCheckResult,
} from '../api/generated'
import {
  CHECK_AVAILABLE_LABEL,
  CHECK_AVAILABLE_SENTENCE,
  CHECK_UNSERVABLE_LEAD,
  CHECK_CHIP_MARKS,
  CHECK_FLAGGED_DETAIL,
  CHECK_LAST_RUN_VERBS,
  CHECK_METHOD_ABSENT_NOUNS,
  CHECK_METHOD_APPROACH,
  CHECK_METHOD_FILL,
  CHECK_METHOD_LABELS,
  CHECK_METHOD_NOUNS,
  IMPLEMENTED_CHECK_METHOD_ORDER,
  CHECK_METHOD_SETUP_VERBS,
  CHECK_METHOD_TAB,
  CHECK_RAN_IN_SANDBOX_SENTENCE,
  CHECK_RAN_ON_HOST_SENTENCE,
  CHECK_STATE_LABELS,
  CHECK_STATE_SENTENCES,
  CHECK_STATE_TONES,
  CHECK_UNFINISHED_WORDS,
  CODE_REVIEW_DETAIL,
  CODE_REVIEW_NO_VERDICT,
  CODE_REVIEW_TAB,
  COLLAPSE_ABSENT_PAST,
  NOT_PASSED_TITLE,
  NOT_RUN_TITLE,
  UNFINISHED_CHECK_LINE,
  PROJECT_CHECK_METHOD,
  PROVEN_DETAIL,
  PROVEN_TITLE,
  STORY_UNFINISHED_TITLE,
  REVIEW_TAB_LABELS,
  REVIEW_TAB_ORDER,
  SIGNOFF_VERDICT_TONES,
  SIGNOFF_VERDICT_WORDS,
  VERDICT_BEARING_METHODS,
  VERDICT_FLAGGED_NOTE,
} from './checkMethodConstants'
import type {
  CheckActionHost,
  CheckActionOffer,
  CheckCallout,
  CheckChipFace,
  CheckMethodAction,
  CheckMethodId,
  CheckMethodRow,
  CheckMethodState,
  CheckUnfinishedTests,
  ReviewTab,
  ReviewTabId,
  ReviewTabsInput,
  SignoffVerdict,
  SignoffVerdictInput,
  SignoffVerdictKey,
} from './checkMethodTypes'
import { codeReviewVerdict, isCodeReview, reportAuthor } from './reviewEvidenceView'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import { checkTestCounts, finishedTestFileCount } from './testCounts'
import { formatDurationMs, timeAgo } from './time'

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

/**
 * Why the project's page cannot be served for the approach that would prove a
 * method, or `undefined` when it can. Fixed by giving the page a way to be
 * served — an agent can set that up — never by installing anything.
 */
function unservableReason(
  approaches: readonly VerificationApproachOption[],
  id: CheckMethodId,
): string | undefined {
  const availability = approaches.find((a) => a.spec.id === CHECK_METHOD_APPROACH[id])?.availability
  return availability?.status === 'unservable' ? availability.reason : undefined
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Which method a verification check rolls up into. A check that names its
 * category — every project check does — is filed by it; the older heuristics
 * read only what a check without one says about itself.
 */
export function checkMethodFor(
  check: Pick<VerificationCheckResult, 'id' | 'label' | 'kind' | 'category'>,
): CheckMethodId {
  if (check.category) return PROJECT_CHECK_METHOD[check.category]
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
 * run, written from its record — proves nothing on its own; nor does the
 * developer's account of its own checks, whose proof is the checks the host
 * recorded.
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
        case 'developer-checks':
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

function isFailing(check: VerificationCheckResult): boolean {
  return check.status === 'failed' || check.status === 'error'
}

/**
 * A method's state from the checks that ran it. A failure only an ADVISORY
 * check reported is flagged, not failed: the project's own checks step does not
 * stop on it, so neither does the sign-off. One blocking failure beside it
 * still fails the method. Blocking checks that only errored — stopped or
 * crashed before they could say — did not finish: that is not a failure.
 */
function rollUp(checks: readonly VerificationCheckResult[]): CheckMethodState {
  const failing = checks.filter(isFailing)
  const blocking = failing.filter((c) => c.optional !== true)
  if (failing.length > 0 && blocking.length === 0) return 'flagged'
  if (blocking.length > 0) {
    return blocking.every((c) => c.status === 'error') ? 'unfinished' : 'failed'
  }
  if (checks.some((c) => c.status === 'passed')) return 'passed'
  return 'unchecked'
}

/** A ran method's line: what failed or was flagged when something did, else every check's summary. */
/**
 * Where checks ran, as a sentence: "Ran in the sandbox.", or "Ran on the host —
 * why", folded over several to the host when any ran there. `undefined` when
 * none of them says. Pure.
 */
export function checkRanInSentence(
  checks: readonly Pick<VerificationCheckResult, 'ranIn' | 'hostReason'>[],
): string | undefined {
  const { ranIn, hostReason } = projectCheckRanInOf(checks)
  if (ranIn === 'sandbox') return CHECK_RAN_IN_SANDBOX_SENTENCE
  if (ranIn === 'host') {
    return hostReason
      ? `${CHECK_RAN_ON_HOST_SENTENCE} — ${hostReason}`
      : `${CHECK_RAN_ON_HOST_SENTENCE}.`
  }
  return undefined
}

function checksDetail(
  id: CheckMethodId,
  state: CheckMethodState,
  checks: readonly VerificationCheckResult[],
): string {
  const failing = state === 'failed' || state === 'flagged' || state === 'unfinished'
  const summaries = checks
    .filter((c) => (failing ? c.status !== 'passed' : true))
    .map((c) => c.summary)
    .filter((s) => s.trim().length > 0)
  const lead = state === 'flagged' ? [`${CHECK_METHOD_LABELS[id]} ${CHECK_FLAGGED_DETAIL}`] : []
  const where = checkRanInSentence(checks)
  return [...lead, ...summaries, ...(where ? [where] : [])].join(' · ')
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
  if (state === 'passed' || state === 'flagged') {
    return { kind: 'open-proof', tab: CHECK_METHOD_TAB[id] }
  }
  if (state === 'failed' || state === 'unfinished') {
    return { kind: 'request', purpose: 'fix', approachId: known }
  }
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

/** The commands the project's scan found for each method, and the methods it deliberately leaves out. */
function scannedMethods(scan: ProjectChecksListing): {
  commands: Map<CheckMethodId, string[]>
  hidden: Set<CheckMethodId>
  lastRuns: Map<CheckMethodId, ProjectCheckRunMemory>
} {
  const commands = new Map<CheckMethodId, string[]>()
  for (const check of scan.checks) {
    const id = PROJECT_CHECK_METHOD[check.kind]
    commands.set(id, [...(commands.get(id) ?? []), check.command])
  }
  const lastRuns = new Map(scan.lastRuns.map((run) => [PROJECT_CHECK_METHOD[run.check], run]))
  return {
    commands,
    hidden: new Set(scan.hidden.map((h) => PROJECT_CHECK_METHOD[h.kind])),
    lastRuns,
  }
}

/** "Last passed 3 minutes ago in 2m 10s." — how the check last went in this project, on any branch. Pure. */
export function projectCheckLastRunSentence(run: ProjectCheckRunMemory, now?: number): string {
  const when = now !== undefined ? ` ${timeAgo(now, run.ranAt)}` : ''
  const narrowed =
    run.tests && run.tests.length > 0
      ? `, narrowed to ${run.tests.length} test${run.tests.length === 1 ? '' : 's'}`
      : ''
  const where = checkRanInSentence([run])
  return `Last ${CHECK_LAST_RUN_VERBS[run.status]}${when} in ${formatDurationMs(run.durationMs)}${narrowed}.${where ? ` ${where}` : ''}`
}

function availableDetail(
  commands: readonly string[],
  lastRun: ProjectCheckRunMemory | undefined,
  now: number | undefined,
): string {
  const available = `Available — ${commands.map((c) => `\`${c}\``).join(', ')}. Not run on this branch.`
  return lastRun ? `${available} ${projectCheckLastRunSentence(lastRun, now)}` : available
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
    unservableReason(approaches, id),
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
  /**
   * What a scan of the project found. Known, it decides a command check's
   * absence: detected and not run is available, not detected is not set up,
   * and a kind the scan hides — a type check the build already does — is no
   * chip at all unless something ran it.
   */
  projectChecks?: ProjectChecksListing
  /** Epoch ms now — what an available check's last run is told as "3 minutes ago" against. */
  now?: number
}): CheckMethodRow[] {
  const { verification, approaches, evidence } = input
  const scanned = input.projectChecks ? scannedMethods(input.projectChecks) : undefined
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

  const shown = IMPLEMENTED_CHECK_METHOD_ORDER.filter(
    (id) => !scanned?.hidden.has(id) || byMethod.has(id),
  )
  return shown.map((id) => {
    const matched = byMethod.get(id) ?? []
    const captured = id === 'device' ? driven : (evidenceCounts.get(id) ?? 0)
    const isRun = CHECK_METHOD_FILL[id] === 'run'

    let state: CheckMethodState
    let detail: string
    let finding: ReviewTabId | undefined
    let available: CheckMethodRow['available']
    if (isRun) {
      const commands = scanned?.commands.get(id) ?? []
      state =
        matched.length > 0
          ? rollUp(matched)
          : scanned
            ? commands.length > 0
              ? 'unchecked'
              : 'unconfigured'
            : absentRunState(id, verification)
      available = state === 'unchecked' && commands.length > 0 ? { commands } : undefined
      detail =
        matched.length > 0
          ? checksDetail(id, state, matched)
          : available
            ? availableDetail(available.commands, scanned?.lastRuns.get(id), input.now)
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
      detail = checksDetail(id, state, matched)
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
      ...(available ? { available } : {}),
      ...(state === 'unfinished' ? unfinishedTestsOf(matched) : {}),
      ...(state === 'unconfigured' && captured === 0 && unservableReason(approaches, id)
        ? { unservable: true as const }
        : {}),
    }
  })
}

/**
 * The test files a method's checks could not finish, from the first check whose
 * record named them, with how the others went — nothing for an older record
 * that named none.
 */
function unfinishedTestsOf(
  checks: readonly VerificationCheckResult[],
): { unfinished: CheckUnfinishedTests } | Record<string, never> {
  const check = checks.find((c) => c.status === 'error' && (c.unfinishedFiles?.length ?? 0) > 0)
  if (!check?.unfinishedFiles) return {}
  const files = finishedTestFileCount(check)
  const suites = check.testSuites ?? []
  const passed =
    suites.length > 0
      ? suites.reduce((n, suite) => n + suite.passed, 0)
      : checkTestCounts(check)?.passed
  return {
    unfinished: {
      checkLabel: check.label,
      files: check.unfinishedFiles,
      ...(files !== undefined && files > 0 && passed !== undefined
        ? { finished: { files, passed } }
        : {}),
    },
  }
}

/** The mark and accessible state a chip shows, on every client. */
export function checkChipFace(row: Pick<CheckMethodRow, 'state' | 'available'>): CheckChipFace {
  if (row.available && row.state === 'unchecked') {
    return { mark: CHECK_CHIP_MARKS.available, stateLabel: CHECK_AVAILABLE_LABEL }
  }
  if (row.state === 'unfinished') {
    return {
      mark: CHECK_CHIP_MARKS.unfinished,
      stateLabel: CHECK_STATE_LABELS.unfinished,
      words: CHECK_UNFINISHED_WORDS,
    }
  }
  return { mark: CHECK_CHIP_MARKS[row.state], stateLabel: CHECK_STATE_LABELS[row.state] }
}

/** The rows' labels as a sentence names them: "Tests, Types and Build". */
export function joinNames(rows: readonly Pick<CheckMethodRow, 'label'>[]): string {
  const names = rows.map((r) => r.label)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** What a verdict adds about the methods only advisory checks flagged — nothing when none were. */
function flaggedNote(flagged: readonly CheckMethodRow[]): string {
  return flagged.length > 0 ? ` ${joinNames(flagged)} ${VERDICT_FLAGGED_NOTE}` : ''
}

/**
 * The headline. Failure — or a check that did not finish — wins, the two
 * counted apart; then "nothing at all was checked"; then any
 * verdict-bearing method that could have run and did not demotes to partly;
 * otherwise proven. A method the project never had cannot be held against the
 * run — it is shown, but it does not demote.
 *
 * A FAILURE counts from ANY implemented method, optional or not: OPTIONAL means
 * "its ABSENCE never demotes" (a change needing no UI test is not "partly"), NOT
 * "its failure is forgiven". A red UI-test chip must never sit under "proven".
 *
 * A FLAGGED method — only advisory checks failed it — is read as passed, and
 * the detail names it.
 */
export function signoffVerdict(input: SignoffVerdictInput): SignoffVerdict {
  const bearing = input.rows.filter((r) => VERDICT_BEARING_METHODS.includes(r.id))
  // Failure is read across every row, not just verdict-bearing ones — an optional
  // method (uitests) is the first that can actually reach `failed`, and swallowing
  // that would print "Every configured check passed" above a red chip.
  const failed = input.rows.filter((r) => r.state === 'failed')
  const unfinished = input.rows.filter((r) => r.state === 'unfinished')
  const flagged = input.rows.filter((r) => r.state === 'flagged')
  const passed = bearing.filter((r) => r.state === 'passed')
  const cleared = bearing.filter((r) => r.state === 'passed' || r.state === 'flagged')
  const unchecked = bearing.filter((r) => r.state === 'unchecked')

  let key: SignoffVerdictKey
  let title: string
  let detail: string
  if (failed.length > 0 || unfinished.length > 0) {
    key = 'failed'
    title = NOT_PASSED_TITLE(failed, unfinished)
    detail = input.rows
      .filter((r) => r.state === 'failed' || r.state === 'unfinished')
      .map((r) => (r.unfinished ? UNFINISHED_CHECK_LINE(r.unfinished.checkLabel) : r.detail))
      .join(' · ')
  } else if (!input.verified && cleared.length === 0) {
    key = 'not-run'
    title = NOT_RUN_TITLE
    detail = NOT_VERIFIED_DETAIL
  } else if (unchecked.length > 0) {
    key = 'partly'
    title = `Passes what ran — ${joinNames(unchecked)} never ran`
    detail = `${passed.length > 0 ? `${joinNames(passed)} passed.` : 'Nothing that ran failed.'}${flaggedNote(flagged)}`
  } else if (cleared.length === 0) {
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
    detail = `${PROVEN_DETAIL}${flaggedNote(flagged)}`
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
  if (row.unservable) return { lead: CHECK_UNSERVABLE_LEAD, detail: row.detail }
  const lead =
    row.state === 'unconfigured'
      ? `There is no ${row.noun} in this project, so there is no tab for it. Ask for it here.`
      : row.available && row.state === 'unchecked'
        ? CHECK_AVAILABLE_SENTENCE
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

/** A method nothing ran — available but not run, or not in the project at all. */
export function isAbsentCheck(row: Pick<CheckMethodRow, 'state'>): boolean {
  return row.state === 'unchecked' || row.state === 'unconfigured'
}

/** The methods that actually ran — what a Tests or Build tab lists; the absent ones are the chips' to say. */
export function ranCheckMethods<T extends Pick<CheckMethodRow, 'state'>>(rows: readonly T[]): T[] {
  return rows.filter((row) => !isAbsentCheck(row))
}

/**
 * The chips: what was checked first, in the order of the tabs below them —
 * `tabOrder`, lead tab first — each placed by the tab it opens, then what was
 * not, in the same order. Past a few absent ones those fold into one chip, so
 * the common case — most things not checked — is not a wall of dashes.
 */
export function checkRowLayout(
  rows: readonly CheckMethodRow[],
  expanded: boolean,
  tabOrder?: readonly ReviewTabId[],
): CheckRowLayout {
  const ordered = tabOrder ? inTabOrder(rows, tabOrder) : [...rows]
  const ran = ranCheckMethods(ordered)
  const absent = ordered.filter(isAbsentCheck)
  if (expanded || absent.length <= COLLAPSE_ABSENT_PAST) {
    return { visible: [...ran, ...absent], collapsed: [] }
  }
  return { visible: ran, collapsed: absent }
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
