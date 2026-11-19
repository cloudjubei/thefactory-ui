import type {
  ProcessPark,
  ProcessRun,
  ProcessRunWait,
  ProcessWaitAction,
  ProcessWaitFor,
  ProcessWaitSettledHow,
} from 'thefactory-tools/types'
import {
  processRunWaitActions,
  processRunWaitingLabels,
  processWaitForLabels,
} from 'thefactory-tools/utils'

import { processAcceptedByWord } from './processAcceptedUnchecked'
import {
  PROCESS_RUN_WAIT_COPY as COPY,
  PROCESS_RUN_WAIT_TONE,
  PROCESS_WAIT_ACTION_LABELS,
  PROCESS_WAIT_ACTION_SETTLES,
  PROCESS_WAIT_CONFIRM_COPY,
  PROCESS_WAIT_HOW_WORDS,
  PROCESS_WAIT_NOTE_MAX_CHARS,
  PROCESS_WAIT_SETTLED_TONE,
} from './processRunWaitConstants'
import type {
  GroupSignOffRepoWait,
  ProcessRunWaitEntryView,
  ProcessRunWaitView,
  ProcessWaitActionBody,
  ProcessWaitConfirmView,
  ProcessWaitPending,
} from './processRunWaitTypes'
import { PROCESS_WAIT_FOR_KIND_LABELS } from './processWaitForDraftConstants'
import { formatFriendlyTimestamp } from './time'

type WaitRun = Pick<ProcessRun, 'status' | 'plan' | 'ledger'> &
  Partial<Pick<ProcessRun, 'waitsFor' | 'wait' | 'park' | 'workBranch'>>

const ENDED: readonly ProcessRun['status'][] = ['succeeded', 'failed', 'cancelled']

const friendly = (at: number): string => formatFriendlyTimestamp(new Date(at).toISOString())

const sentence = (labels: readonly string[]): string =>
  processWaitForLabels(labels.map((label) => ({ label })))

/** Whether a park waits on work elsewhere — blockers, or other work — with nothing asked of the person. Pure. */
export function isProcessParkWaitingElsewhere(
  park: Pick<ProcessPark, 'reason'> | undefined,
): boolean {
  return park?.reason === 'waiting-on-blockers' || park?.reason === 'waiting-on-work'
}

/** Whether a run is parked at its wait for other work before its proof. Pure. */
export function isProcessRunWaitingOnWork(
  run: Pick<ProcessRun, 'status'> & Partial<Pick<ProcessRun, 'park'>>,
): boolean {
  return run.status === 'parked' && run.park?.reason === 'waiting-on-work'
}

/**
 * The run as it stands once a person's action on its wait is carried out:
 * settled as theirs for Continue now and Stop waiting, open again for Wait
 * again — what the card shows while the action is on its way. Pure.
 */
export function withPendingWaitAction<T extends Partial<Pick<ProcessRun, 'wait'>>>(
  run: T,
  pending: ProcessWaitPending,
): T {
  const how = PROCESS_WAIT_ACTION_SETTLES[pending.action]
  const { settled: _settled, ...open } = run.wait ?? { entries: [] }
  const wait: ProcessRunWait = how
    ? { ...open, settled: { how, at: pending.at, decidedBy: 'person' } }
    : open
  return { ...run, wait }
}

function baseOf(run: WaitRun): string {
  return run.wait?.baseRef ?? run.workBranch?.baseRef ?? COPY.base
}

function entryViews(run: WaitRun, base: string): ProcessRunWaitEntryView[] {
  return (run.wait?.entries ?? []).flatMap((entry): ProcessRunWaitEntryView[] => {
    if (entry.onBase) {
      return [
        {
          label: entry.label,
          onBase: true,
          line: COPY.onBase(base, PROCESS_WAIT_HOW_WORDS[entry.onBase.how]),
        },
      ]
    }
    return entry.waiting ? [{ label: entry.label, onBase: false, line: entry.waiting }] : []
  })
}

function settledHeadline(how: ProcessWaitSettledHow, labels: string, base: string): string {
  if (how === 'on-base') return COPY.reached(labels, base)
  return how === 'continued' ? COPY.continued : COPY.dropped
}

/**
 * A run's wait for other work, as its card shows it: what it still waits for
 * on which base, since when it waits at its wait step, that it carries on by
 * itself, each entry as git last read it, and the actions a person may take
 * now — or, once settled, how and when, by whom and their note. A pending
 * action shows its outcome at once, with no buttons until it is answered.
 * Nothing for a run that waits for nothing, or that ended before its wait
 * settled. Pure.
 */
export function processRunWaitView(
  source: WaitRun,
  options: { pending?: ProcessWaitPending; formatAt?: (at: number) => string } = {},
): ProcessRunWaitView | undefined {
  if (!source.waitsFor?.length) return undefined
  const run = options.pending ? withPendingWaitAction(source, options.pending) : source
  const settled = run.wait?.settled
  if (!settled && ENDED.includes(run.status)) return undefined
  const formatAt = options.formatAt ?? friendly
  const base = baseOf(run)
  const pending = options.pending !== undefined
  const actions = pending
    ? []
    : processRunWaitActions(run).map((action) => ({
        action,
        label: PROCESS_WAIT_ACTION_LABELS[action],
      }))
  const entries = entryViews(run, base)
  const note = run.wait?.decisions?.at(-1)?.note
  if (settled) {
    const who = settled.decidedBy ? [COPY.by(processAcceptedByWord(settled.decidedBy))] : []
    return {
      state: 'settled',
      tone: PROCESS_WAIT_SETTLED_TONE[settled.how],
      headline: settledHeadline(settled.how, sentence(run.waitsFor!.map((e) => e.label)), base),
      meta: [COPY.at(formatAt(settled.at)), ...who],
      entries,
      actions,
      ...(note && settled.how !== 'on-base' ? { note } : {}),
      pending,
    }
  }
  const waiting = isProcessRunWaitingOnWork(run)
  const still = processRunWaitingLabels(run)
  const since = waiting && run.wait?.since !== undefined ? run.wait.since : undefined
  return {
    state: waiting ? 'waiting' : 'ahead',
    tone: PROCESS_RUN_WAIT_TONE,
    headline: COPY.waits(
      sentence(still.length > 0 ? still : run.waitsFor!.map((e) => e.label)),
      base,
    ),
    meta: [...(since !== undefined ? [COPY.since(formatAt(since))] : []), COPY.carriesOn],
    entries,
    actions,
    pending,
  }
}

/**
 * What a run parked on work elsewhere says in a line — a list row, a chat
 * card: its wait for other work in its card's words, else its park's own
 * message. Pure.
 */
export function processRunWaitingLine(run: WaitRun, formatAt?: (at: number) => string): string {
  const view = isProcessRunWaitingOnWork(run)
    ? processRunWaitView(run, formatAt ? { formatAt } : {})
    : undefined
  return view ? processRunWaitLine(view) : (run.park?.message ?? COPY.label)
}

/** A wait's card in one line: its headline and its facts. Pure. */
export function processRunWaitLine(view: Pick<ProcessRunWaitView, 'headline' | 'meta'>): string {
  return [view.headline, ...view.meta].join(COPY.separator)
}

/** What the confirm before a person's action on a run's wait says. Pure. */
export function processWaitConfirmView(
  action: ProcessWaitAction,
  run: WaitRun,
): ProcessWaitConfirmView {
  const copy = PROCESS_WAIT_CONFIRM_COPY[action]
  const labels = sentence(
    action === 'wait-again'
      ? (run.waitsFor ?? []).map((e) => e.label)
      : processRunWaitingLabels(run),
  )
  return {
    title: copy.title,
    body: copy.body(labels, baseOf(run)),
    confirm: PROCESS_WAIT_ACTION_LABELS[action],
    cancel: PROCESS_WAIT_CONFIRM_COPY.cancel,
    noteLabel: PROCESS_WAIT_CONFIRM_COPY.noteLabel,
    notePlaceholder: PROCESS_WAIT_CONFIRM_COPY.notePlaceholder,
  }
}

/** What a person's action on a wait sends: the app they decided on, and their note when they gave one. Pure. */
export function processWaitActionBody(
  decidedVia: ProcessWaitActionBody['decidedVia'],
  note?: string,
): ProcessWaitActionBody {
  const trimmed = note?.trim().slice(0, PROCESS_WAIT_NOTE_MAX_CHARS)
  return { decidedVia, ...(trimmed ? { note: trimmed } : {}) }
}

function plannedTargets(entry: ProcessWaitFor): string {
  const targets: [keyof typeof PROCESS_WAIT_FOR_KIND_LABELS, string | undefined][] = [
    ['branch', entry.branch],
    ['commit', entry.commit],
    ['pull-request', entry.pullRequestUrl],
  ]
  return targets
    .flatMap(([kind, value]) =>
      value ? [COPY.target(PROCESS_WAIT_FOR_KIND_LABELS[kind], value)] : [],
    )
    .join(COPY.separator)
}

/**
 * A wait no run holds yet — a proposed part's, a leg's before its run is read —
 * as a run's wait card shows a run on its way to it: what it waits for on which
 * base, that it carries on by itself, and the branch, commit or pull request
 * each entry is found by. No actions. Nothing for no wait. Pure.
 */
export function processPlannedWaitView(
  waitsFor: readonly ProcessWaitFor[] | undefined,
  baseBranch?: string,
): ProcessRunWaitView | undefined {
  if (!waitsFor?.length) return undefined
  return {
    state: 'ahead',
    tone: PROCESS_RUN_WAIT_TONE,
    headline: COPY.waits(processWaitForLabels(waitsFor), baseBranch ?? COPY.base),
    meta: [COPY.carriesOn],
    entries: waitsFor.flatMap((entry) => {
      const line = plannedTargets(entry)
      return line ? [{ label: entry.label, onBase: false, line }] : []
    }),
    actions: [],
    pending: false,
  }
}

/** What a group leg waiting on other work says on its card, before its run is read. Pure. */
export function processGroupLegWaitLine(leg: {
  waitsFor?: readonly ProcessWaitFor[]
  baseBranch?: string
}): string | undefined {
  const view = processPlannedWaitView(leg.waitsFor, leg.baseBranch)
  return view ? processRunWaitLine(view) : undefined
}

/** What a group sign-off says of a repo's wait, in the same words as its run's card. Pure. */
export function groupSignOffWaitLine(
  wait: GroupSignOffRepoWait | undefined,
  baseRef: string | undefined,
  formatAt: (at: number) => string = friendly,
): string | undefined {
  if (!wait?.waitsFor.length) return undefined
  const base = baseRef ?? COPY.base
  if (wait.settled) return settledHeadline(wait.settled, sentence(wait.waitsFor), base)
  const still = wait.waitingOn.length > 0 ? wait.waitingOn : wait.waitsFor
  return processRunWaitLine({
    headline: COPY.waits(sentence(still), base),
    meta: [...(wait.since !== undefined ? [COPY.since(formatAt(wait.since))] : []), COPY.carriesOn],
  })
}
