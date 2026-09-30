import type {
  ProcessOpenWork,
  ProcessOpenWorkChoice,
  ProcessOpenWorkState,
  ProcessRun,
} from 'thefactory-tools/types'
import {
  AMENDMENT_CLOSED_SIGN_OFF,
  AMENDMENT_REOPENED_APPROVED,
  AMENDMENT_REOPENED_ENDED,
  AMENDMENT_SET_ASIDE_PARK,
  OPEN_WORK_EXTEND_LABEL,
  OPEN_WORK_FRESH_LABEL,
  OPEN_WORK_NEW_ON_BRANCH_LABEL,
  OPEN_WORK_WARNING_PARALLEL,
  OPEN_WORK_WARNING_UNREVIEWED,
} from './processOpenWorkConstants'
import { formatDateShort } from './time'
import type {
  ProcessAmendmentView,
  ProcessOpenWorkMetadata,
  ProcessOpenWorkOptionView,
  ProcessOpenWorkView,
} from './processOpenWorkTypes'

const HEADLINE: Record<ProcessOpenWorkState, (title: string) => string> = {
  running: (title) => `“${title}” is still running on this story.`,
  parked: (title) => `“${title}” is still open on this story, waiting on a decision.`,
  'awaiting-sign-off': (title) => `“${title}” is waiting for your sign-off on this story.`,
  unmerged: (title) => `“${title}” finished, but its work is not merged.`,
}

/**
 * What could go wrong. A live run writes the story's files alongside the new
 * work; work that finished unmerged is unreviewed; a run waiting at its
 * sign-off is both — unreviewed, and still live (a change request sends it
 * back to work).
 */
const WARNINGS: Record<ProcessOpenWorkState, string[]> = {
  running: [OPEN_WORK_WARNING_PARALLEL],
  parked: [OPEN_WORK_WARNING_PARALLEL],
  'awaiting-sign-off': [OPEN_WORK_WARNING_UNREVIEWED, OPEN_WORK_WARNING_PARALLEL],
  unmerged: [OPEN_WORK_WARNING_UNREVIEWED],
}

const EXTEND_DETAIL: Record<ProcessOpenWorkState, string> = {
  running:
    'The new work joins that run and everything is signed off together: the new features run after its own, then the whole story is walked through, reviewed and reported once.',
  parked:
    'The new work joins that run and everything is signed off together: the new features run after its own once you answer what it is waiting on, then the whole story is walked through, reviewed and reported once.',
  'awaiting-sign-off':
    'The new work joins that run and everything is signed off together: its waiting sign-off is closed without a decision, the new features run, and the whole story is walked through, reviewed and reported again before one sign-off.',
  unmerged:
    'The new work joins that run and everything is signed off together: the run is reopened, its earlier approval is set aside (it stays in the run’s history), the new features run, and the whole story comes back for one new sign-off.',
}

function newOnBranchDetail(branch: string | undefined): string {
  const tip = branch ? ` (from the tip of ${branch})` : ''
  return `Treats that work as good and starts a separate run on top of it${tip}, for the new features only; the two are signed off separately. This run’s work is brought in only after that run’s work has landed.`
}

const FRESH_DETAIL =
  'Starts from the live branch as if that work did not exist, working every feature left — including ones that run already did. The open work stays unmerged and the two may conflict when merged.'

const featureList = (features: readonly { title: string }[]): string | undefined =>
  features.length > 0 ? features.map((f) => f.title).join(', ') : undefined

/**
 * A story's open work as the launch approval shows it: which run, where it
 * stands, what could go wrong, and each way to proceed with what it entails.
 */
export function processOpenWorkView(openWork: ProcessOpenWork): ProcessOpenWorkView {
  const details: Record<ProcessOpenWorkChoice, { label: string; detail: string }> = {
    extend: { label: OPEN_WORK_EXTEND_LABEL, detail: EXTEND_DETAIL[openWork.state] },
    'new-on-branch': {
      label: OPEN_WORK_NEW_ON_BRANCH_LABEL,
      detail: newOnBranchDetail(openWork.branch),
    },
    fresh: { label: OPEN_WORK_FRESH_LABEL, detail: FRESH_DETAIL },
  }
  const options = openWork.options.map<ProcessOpenWorkOptionView>((option) => ({
    choice: option.choice,
    ...details[option.choice],
    risky: option.choice === 'fresh',
    available: option.available,
    ...(option.reason ? { reason: option.reason } : {}),
  }))
  const holds = featureList(openWork.features)
  const adds = featureList(openWork.newFeatures)
  return {
    headline: HEADLINE[openWork.state](openWork.title),
    warnings: [...WARNINGS[openWork.state]],
    ...(holds ? { holds } : {}),
    ...(adds ? { adds } : {}),
    options,
  }
}

/**
 * The approval's metadata for `choice`, or `undefined` while nothing that can
 * be taken is chosen — the launch cannot start over open work without one.
 */
export function processOpenWorkMetadata(
  openWork: ProcessOpenWork,
  choice: ProcessOpenWorkChoice | undefined,
): ProcessOpenWorkMetadata | undefined {
  if (!choice) return undefined
  const option = openWork.options.find((o) => o.choice === choice)
  if (!option?.available) return undefined
  return { openWork: choice, runId: openWork.runId, state: openWork.state }
}

/**
 * Where work was added to a run after it started — each added step tagged with
 * when, and a line per addition saying what came in and what it closed, set
 * aside or reopened.
 */
export function processAmendmentView(
  run: Pick<ProcessRun, 'plan' | 'ledger'>,
): ProcessAmendmentView {
  const addedSteps: Record<string, string> = {}
  const notes: string[] = []
  for (const amendment of run.plan.amendments ?? []) {
    const date = formatDateShort(new Date(amendment.at))
    const names = amendment.stepIds.map((id) => run.plan.steps.find((s) => s.id === id)?.name ?? id)
    for (const id of amendment.stepIds) addedSteps[id] = `Added ${date}`
    const lines = [`Added ${date}: ${names.join(', ')}.`]
    const closed = amendment.closedEntryId
      ? run.ledger.find((e) => e.id === amendment.closedEntryId)
      : undefined
    const closedStep = closed ? run.plan.steps.find((s) => s.id === closed.stepId) : undefined
    if (closedStep) {
      lines.push(closedStep.kind === 'gate' ? AMENDMENT_CLOSED_SIGN_OFF : AMENDMENT_SET_ASIDE_PARK)
    }
    if (amendment.reopened) {
      lines.push(
        amendment.reopened.approvalEntryId ? AMENDMENT_REOPENED_APPROVED : AMENDMENT_REOPENED_ENDED,
      )
    }
    notes.push(lines.join(' '))
  }
  return { addedSteps, notes }
}
