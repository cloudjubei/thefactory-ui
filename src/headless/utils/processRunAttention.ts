import type { ProcessPark, ProcessRun, ProcessWaitingAsk } from 'thefactory-tools/types'
import {
  isProcessRunAwaitingIntegration,
  processRunDecision,
  processRunSendBackGateId,
  processStepStates,
} from 'thefactory-tools/utils'

import { cleanCliToolName } from './cliRunner'
import { latestProcessChecks } from './processChecksView'
import { processIntegrationView } from './processIntegration'
import { isProcessRunCurrent } from './processRunCurrent'
import {
  PROCESS_RUN_ATTENTION_SECTIONS,
  PROCESS_RUN_NEED_ATTEMPT,
  PROCESS_RUN_NEED_BASE_CONFLICT,
  PROCESS_RUN_NEED_DECISIONS,
  PROCESS_RUN_NEED_FAILED_TIMES,
  PROCESS_RUN_NEED_NOT_MERGED,
  PROCESS_RUN_NEED_PERMISSIONS,
  PROCESS_RUN_NEED_SEND_BACK_NO_NOTE,
  PROCESS_RUN_NEED_SIGN_OFF,
  PROCESS_RUN_NEED_VERBS,
} from './processRunAttentionConstants'
import type {
  ProcessRunAttentionSection,
  ProcessRunAttentionSectionId,
  ProcessRunListRow,
} from './processRunAttentionTypes'
import { processRunBadge, processRunChain, processRunChipLabel } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'
import { ledgerCodeReview } from './storySignoff'

/**
 * Where a run sits in the Processes list's Current tab: stopped for the person
 * (`needs-you` — a question, an approval, a failure, work that was not merged,
 * changes to send back), at its sign-off (`sign-off`), working (`running`), or
 * merging approved work (`merging`). `undefined` for a run that is history. Pure.
 */
export function processRunAttentionSection(
  run: ProcessRun,
): ProcessRunAttentionSectionId | undefined {
  if (!isProcessRunCurrent(run)) return undefined
  if (run.integration?.status === 'integrating') return 'merging'
  if (run.status === 'parked') return run.park?.reason === 'gate' ? 'sign-off' : 'needs-you'
  if (run.status === 'running' || run.status === 'pending') return 'running'
  return 'needs-you'
}

/**
 * The one line a Processes row says under its title: what the run needs from
 * the person ("Answer: which branch to merge?", "Approve: push work branch",
 * "Decide: failed twice on Verify"), what its sign-off rests on ("Checks 22/22 ·
 * review clean"), the step it is on, or where its work is being merged.
 * `undefined` for a run that is history. Pure.
 */
export function processRunNeedLine(run: ProcessRun): string | undefined {
  switch (processRunAttentionSection(run)) {
    case 'needs-you':
      return needsYouLine(run)
    case 'sign-off':
      return signOffLine(run)
    case 'running':
      return runningLine(run)
    case 'merging':
      return processIntegrationView(run)?.title ?? PROCESS_RUN_WORDS.merging
    default:
      return undefined
  }
}

/** A row of the Processes list — see {@link ProcessRunListRow}. Pure. */
export function processRunListRow(run: ProcessRun): ProcessRunListRow {
  const section = processRunAttentionSection(run)
  return {
    title: run.title.trim() || processRunChain(run),
    line: processRunNeedLine(run) ?? processRunChipLabel(run),
    tone: processRunBadge(run).tone,
    ...(section ? { section } : {}),
    asks: section === 'needs-you',
    live: section === 'running' || section === 'merging',
  }
}

/**
 * The Current tab's sections — Needs you, Sign off, Running, Merging — each
 * with its runs in the order given; a section with none is left out, and so is
 * every run that is history. Pure.
 */
export function processRunAttentionSections<T extends ProcessRun>(
  runs: readonly T[],
): ProcessRunAttentionSection<T>[] {
  const bySection = new Map<ProcessRunAttentionSectionId, T[]>()
  for (const run of runs) {
    const id = processRunAttentionSection(run)
    if (!id) continue
    bySection.set(id, [...(bySection.get(id) ?? []), run])
  }
  return PROCESS_RUN_ATTENTION_SECTIONS.flatMap((section) => {
    const sectionRuns = bySection.get(section.id)
    return sectionRuns ? [{ ...section, runs: sectionRuns }] : []
  })
}

/** How many runs wait on the person — Needs you and Sign off — what the Current tab counts. Pure. */
export function processRunWaitingCount(runs: readonly ProcessRun[]): number {
  return runs.filter((run) => {
    const section = processRunAttentionSection(run)
    return section === 'needs-you' || section === 'sign-off'
  }).length
}

const need = (verb: keyof typeof PROCESS_RUN_NEED_VERBS, what: string): string =>
  `${PROCESS_RUN_NEED_VERBS[verb]}: ${what}`

const firstLine = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '') ?? ''

function needsYouLine(run: ProcessRun): string {
  if (isProcessRunAwaitingIntegration(run)) return need('retry', notMergedWhat(run))
  if (processRunSendBackGateId(run) !== undefined) {
    const decision = processRunDecision(run)
    const note = decision.kind === 'not-accepted' ? decision.note?.trim() : undefined
    return need('sendBack', note ? `“${note}”` : PROCESS_RUN_NEED_SEND_BACK_NO_NOTE)
  }
  const park = run.park
  if (!park) return PROCESS_RUN_WORDS.needsYou
  if (park.ask) return askLine(park.ask)
  if (park.baseConflict)
    return need('decide', PROCESS_RUN_NEED_BASE_CONFLICT(park.baseConflict.baseRef))
  return need('decide', decisionWhat(run, park))
}

function notMergedWhat(run: ProcessRun): string {
  if (run.workBranch?.shadow) return PROCESS_RUN_NEED_NOT_MERGED.shadow
  if (run.integration?.mode === 'pull-request') return PROCESS_RUN_NEED_NOT_MERGED.pullRequest
  return PROCESS_RUN_NEED_NOT_MERGED.git(run.workBranch?.baseRef ?? '')
}

function askLine(ask: ProcessWaitingAsk): string {
  if (ask.kind === 'question') {
    const asked = ask.request?.args?.question
    return need(
      'answer',
      typeof asked === 'string' && asked.trim() ? asked.trim() : firstLine(ask.detail),
    )
  }
  if (ask.kind === 'blocker') return need('unblock', firstLine(ask.detail))
  const request = ask.request
  const permission = request ? PROCESS_RUN_NEED_PERMISSIONS[request.actionKind] : undefined
  if (request && permission) return need('approve', permission(request))
  const tool = request?.toolName ?? request?.actionKind
  return need('approve', tool ? toolWords(tool) : firstLine(ask.title))
}

function toolWords(tool: string): string {
  return cleanCliToolName(tool)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
}

function decisionWhat(run: ProcessRun, park: ProcessPark): string {
  const state = processStepStates(run).find((s) => s.step.id === park.stepId)
  const step = state?.step.name ?? park.stepId ?? ''
  if (park.reason === 'step-failed' && state && state.attempts > 1) {
    return PROCESS_RUN_NEED_FAILED_TIMES(state.attempts, step)
  }
  const said = PROCESS_RUN_NEED_DECISIONS[park.reason as keyof typeof PROCESS_RUN_NEED_DECISIONS]
  return said ? said(step) : park.message
}

function signOffLine(run: ProcessRun): string {
  const checks = latestProcessChecks(run)?.checks.filter((c) => c.status !== 'skipped')
  const checksPart = checks?.length
    ? PROCESS_RUN_NEED_SIGN_OFF.checks(
        checks.filter((c) => c.status === 'passed').length,
        checks.length,
      )
    : undefined
  const review = latestReview(run)
  const reviewPart = review ? PROCESS_RUN_NEED_SIGN_OFF.review[review] : undefined
  if (!checksPart && !reviewPart) return PROCESS_RUN_NEED_SIGN_OFF.ready
  if (!checksPart) return capitalise(reviewPart ?? '')
  return reviewPart ? `${checksPart} · ${reviewPart}` : checksPart
}

function latestReview(run: ProcessRun): keyof typeof PROCESS_RUN_NEED_SIGN_OFF.review | undefined {
  const judges = new Set(run.plan.steps.filter((s) => s.kind === 'judge').map((s) => s.id))
  for (let i = run.ledger.length - 1; i >= 0; i--) {
    const entry = run.ledger[i]
    if (!judges.has(entry.stepId) || entry.status === 'running') continue
    const review = ledgerCodeReview(entry)
    if (review) return review.verdict
  }
  return undefined
}

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

function runningLine(run: ProcessRun): string {
  const current = processStepStates(run).find((s) => s.current)
  if (!current) return PROCESS_RUN_WORDS.starting
  return current.attempts > 1
    ? `${current.step.name} · ${PROCESS_RUN_NEED_ATTEMPT(current.attempts)}`
    : current.step.name
}
