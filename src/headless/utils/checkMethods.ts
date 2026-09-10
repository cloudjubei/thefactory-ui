/**
 * The "what was checked" row and the verdict above it, derived once for both
 * clients. Everything here is a pure projection of the run record, the
 * verification plan and the filed evidence — no React, no I/O.
 */

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
  CHECK_METHOD_ORDER,
  CHECK_METHOD_SETUP_VERBS,
  CHECK_METHOD_TAB,
  CHECK_STATE_TONES,
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
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import { formatDurationMs } from './time'

type ApproachState = 'available' | 'unavailable' | 'missing'

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
  if (/\blint/.test(text)) return 'lint'
  if (/format|prettier|ktlint|spotless|\bfmt\b/.test(text)) return 'format'
  return 'build'
}

/** Which method a piece of filed evidence proves; logs prove nothing by themselves. */
export function evidenceMethodFor(ref: Pick<ReviewEvidenceRef, 'kind'>): CheckMethodId | undefined {
  switch (ref.kind) {
    case 'screenshot':
      return 'screens'
    case 'recording':
      return 'walkthrough'
    case 'report':
      return 'report'
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

function actionFor(
  id: CheckMethodId,
  state: CheckMethodState,
  approaches: readonly VerificationApproachOption[],
): CheckMethodAction {
  const approachId = CHECK_METHOD_APPROACH[id]
  const known = approachState(approaches, approachId) === 'missing' ? undefined : approachId
  if (state === 'passed') return { kind: 'open-proof', tab: CHECK_METHOD_TAB[id] }
  if (state === 'failed') return { kind: 'request', purpose: 'fix', approachId: known }
  if (state === 'unchecked') {
    return CHECK_METHOD_FILL[id] === 'run'
      ? { kind: 'run' }
      : { kind: 'request', purpose: 'capture', approachId: known }
  }
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
  const hints = approachHints(approaches, CHECK_METHOD_APPROACH[id])
  return hints ?? `This project has no ${CHECK_METHOD_ABSENT_NOUNS[id]}.`
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
  /** Who decided the run, when anyone has — a `reviewer-agent` verdict IS the diff review. */
  verdictBy?: string
}): CheckMethodRow[] {
  const { verification, approaches, evidence } = input
  const checks = verification?.checks ?? []
  const byMethod = new Map<CheckMethodId, VerificationCheckResult[]>()
  for (const check of checks) {
    const id = checkMethodFor(check)
    byMethod.set(id, [...(byMethod.get(id) ?? []), check])
  }
  const evidenceCounts = new Map<CheckMethodId, number>()
  for (const ref of evidence) {
    const id = evidenceMethodFor(ref)
    if (!id) continue
    evidenceCounts.set(id, (evidenceCounts.get(id) ?? 0) + 1)
  }
  const driven = (evidenceCounts.get('screens') ?? 0) + (evidenceCounts.get('walkthrough') ?? 0)
  // "Was the diff actually read" has exactly one recorded answer: a verdict left
  // by the reviewer agent. A human's own verdict is the sign-off itself, not a
  // check that can be held against the run before they have made it.
  const diffReviewed = input.verdictBy === 'reviewer-agent'

  return CHECK_METHOD_ORDER.map((id) => {
    const matched = byMethod.get(id) ?? []
    const captured = id === 'device' ? driven : (evidenceCounts.get(id) ?? 0)
    const isRun = CHECK_METHOD_FILL[id] === 'run'

    let state: CheckMethodState
    let detail: string
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
      state = diffReviewed ? 'passed' : 'unchecked'
      state === 'passed'
      detail = diffReviewed
        ? 'The reviewer agent read the diff'
        : absentDetail(id, 'unchecked', approaches)
    } else {
      state = evidenceState(id, captured, approaches)
      detail =
        state === 'passed' ? evidenceDetail(id, captured) : absentDetail(id, state, approaches)
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
      action: actionFor(id, state, approaches),
      checkIds: matched.map((c) => c.id),
    }
  })
}

function joinNames(rows: readonly CheckMethodRow[]): string {
  const names = rows.map((r) => r.label)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The headline. Failure wins; then "nothing at all was checked"; then any
 * verdict-bearing method that could have run and did not demotes to partly;
 * otherwise proven. A method the project never had cannot be held against the
 * run — it is shown, but it does not demote.
 */
export function signoffVerdict(input: SignoffVerdictInput): SignoffVerdict {
  const bearing = input.rows.filter((r) => VERDICT_BEARING_METHODS.includes(r.id))
  const failed = bearing.filter((r) => r.state === 'failed')
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
 * Which tabs the panel offers. Evidence tabs exist only when that evidence was
 * filed — an empty gallery is a lie about the run. The two code-check tabs
 * always exist, because the way to ask for a missing check lives inside them.
 */
export function reviewTabs(input: ReviewTabsInput): ReviewTab[] {
  // Only Screens, Tests and Changes carry a count. Walkthrough, Build and Report
  // deliberately carry none: their tabs already exist only when there is
  // something in them, so a badge would restate the tab's own presence.
  const counts: Record<ReviewTabId, number | undefined> = {
    screens: input.screens,
    walkthrough: undefined,
    tests: input.testCount > 0 ? input.testCount : undefined,
    build: undefined,
    report: undefined,
    changes: input.changedFiles,
  }
  const present: Record<ReviewTabId, boolean> = {
    screens: input.screens > 0,
    walkthrough: input.walkthroughs > 0,
    tests: true,
    build: true,
    report: input.reports > 0,
    changes: input.changedFiles !== undefined,
  }
  return REVIEW_TAB_ORDER.filter((id) => present[id]).map((id) => ({
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
 * Checked methods lead; past a few absent ones the rest fold into one chip, so
 * the common case — most things not checked — is not a wall of dashes.
 */
export function checkRowLayout(rows: readonly CheckMethodRow[], expanded: boolean): CheckRowLayout {
  const checked = rows.filter((r) => r.state === 'passed' || r.state === 'failed')
  const absent = rows.filter((r) => r.state === 'unchecked' || r.state === 'unconfigured')
  if (expanded || absent.length <= COLLAPSE_ABSENT_PAST) {
    return { visible: [...checked, ...absent], collapsed: [] }
  }
  return { visible: checked, collapsed: absent }
}

/** Ids of the methods whose proof a tab shows — for the popover's "open the proof" jump. */
export function tabForMethod(id: CheckMethodId): ReviewTabId {
  return CHECK_METHOD_TAB[id]
}
