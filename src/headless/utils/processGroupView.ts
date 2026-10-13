import {
  PROCESS_GROUP_LANDING_SOURCE_WORDS,
  PROCESS_GROUP_REOPEN_CANCELLED,
  PROCESS_GROUP_REOPEN_LIVE,
  PROCESS_GROUP_REOPEN_NOTHING,
  PROCESS_GROUP_SHORT_SHA_LENGTH,
  PROCESS_RUN_TERMINAL_STATUSES,
} from 'thefactory-tools/constants'
import type {
  ProcessGroupLeg,
  ProcessGroupLegLandingCheck,
  ProcessGroupRebuildPlan,
  ProcessGroupResumeChoice,
  ProcessGroupResumeInput,
  ProcessGroupRun,
  ProcessIntegrationMode,
} from 'thefactory-tools/types'
import {
  processGroupLegIntegrationModes,
  processGroupLegLandingRefusal,
  processGroupLegMergeGate,
  processGroupLegWaves,
  processGroupParkChoices,
  processGroupRebuildSummary,
  processGroupReopenPlan,
  processGroupReopenRefusal,
  processGroupStartWords,
} from 'thefactory-tools/utils'
import {
  PROCESS_GROUP_CARD_CTA,
  PROCESS_GROUP_LANDED_RESUME_NEXT,
  PROCESS_GROUP_LANDING_FEATURES_DONE,
  PROCESS_GROUP_LEG_OPEN_LABEL,
  PROCESS_GROUP_LEG_OPEN_LABELS,
  PROCESS_GROUP_LEG_STATUS_VIEW,
  PROCESS_GROUP_PARTLY_DONE_BADGE,
  PROCESS_GROUP_RESUME_AGENT,
} from './processGroupViewConstants'
import type {
  ProcessGroupCardView,
  ProcessGroupLandingCheckView,
  ProcessGroupLegRow,
  ProcessGroupParkView,
  ProcessGroupResumeView,
} from './processGroupViewTypes'
import { PROCESS_RUN_STATUS_VIEW, type ProcessStatusTone } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'

const MERGED = ['integrated', 'rebuilding', 'rebuild-failed']

const legTitle = (group: ProcessGroupRun, id: string): string =>
  group.legs.find((l) => l.id === id)?.projectId ?? id

const andList = (names: readonly string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * How a group run reads in one word: a project ready for its own sign-off is
 * "Sign off", the group's own stop or a project's ask "Needs you", and one
 * that ended with only some projects merged "Partly done".
 */
export function processGroupBadge(group: Pick<ProcessGroupRun, 'status' | 'legs'>): {
  label: string
  tone: ProcessStatusTone
} {
  if (group.status === 'parked') return { label: PROCESS_RUN_WORDS.needsYou, tone: 'on_hold' }
  if (group.status === 'running' || group.status === 'pending') {
    if (group.legs.some((l) => l.status === 'at-sign-off')) {
      return { label: PROCESS_RUN_WORDS.signOff, tone: 'review' }
    }
    if (group.legs.some((l) => l.status === 'needs-you')) {
      return { label: PROCESS_RUN_WORDS.needsYou, tone: 'on_hold' }
    }
  }
  if (group.status === 'failed' && group.legs.some((l) => MERGED.includes(l.status))) {
    return PROCESS_GROUP_PARTLY_DONE_BADGE
  }
  return PROCESS_RUN_STATUS_VIEW[group.status]
}

/** How many legs are merged, of how many that will be (skipped and rejected ones left out). */
export function processGroupProgress(group: Pick<ProcessGroupRun, 'legs'>): {
  merged: number
  total: number
} {
  const counted = group.legs.filter((l) => l.status !== 'skipped' && l.status !== 'rejected')
  return {
    merged: counted.filter((l) => MERGED.includes(l.status)).length,
    total: counted.length,
  }
}

/**
 * The legs by dependency level — the order the pipeline draws them in — each as
 * a row: where it stands, what it waits for (a leg at its sign-off, what its
 * merge waits for), what opening its own run is for, whether its work can be
 * marked as landed outside its run, and how it landed once marked. Pure.
 */
export function processGroupLegRows(group: ProcessGroupRun): ProcessGroupLegRow[][] {
  const byId = new Map(group.legs.map((l) => [l.id, l]))
  return processGroupLegWaves(group.legs).map((wave) =>
    wave.flatMap((id) => {
      const leg = byId.get(id)
      if (!leg) return []
      const view = PROCESS_GROUP_LEG_STATUS_VIEW[leg.status]
      const totals = group.totals?.legs[leg.id]
      const waitsFor = legWaitsFor(group, leg)
      return [
        {
          leg,
          label: view.label,
          tone: view.tone,
          openLabel: PROCESS_GROUP_LEG_OPEN_LABELS[leg.status] ?? PROCESS_GROUP_LEG_OPEN_LABEL,
          readyForSignOff: leg.status === 'at-sign-off',
          ...(waitsFor ? { waitsFor } : {}),
          ...(totals ? { totals } : {}),
          ...(leg.rebuildError ? { error: leg.rebuildError } : {}),
          canMarkLanded: !processGroupLegLandingRefusal(group, leg.id),
          ...(leg.landedBy ? { landed: landedText(leg.landedBy) } : {}),
        },
      ]
    }),
  )
}

function legWaitsFor(group: ProcessGroupRun, leg: ProcessGroupLeg): string | undefined {
  if (leg.status === 'at-sign-off') {
    const gate = processGroupLegMergeGate(group, leg.id)
    return gate.canMerge ? undefined : gate.reason
  }
  if (leg.status !== 'blocked') return undefined
  const waiting = leg.dependsOn.filter(
    (d) => group.legs.find((l) => l.id === d)?.status !== 'integrated',
  )
  return waiting.length > 0
    ? `Waits for ${waiting.map((d) => legTitle(group, d)).join(' and ')}`
    : undefined
}

/** The card a group run leaves in the chat. Its one action opens the group run. */
export function processGroupCardView(group: ProcessGroupRun): ProcessGroupCardView {
  const badge = processGroupBadge(group)
  const { merged, total } = processGroupProgress(group)
  const sub = `${total} project${total === 1 ? '' : 's'} · ${merged} merged`
  return {
    title: group.title,
    badge,
    sub,
    ...cardBody(group, badge.tone, merged),
    cta: PROCESS_GROUP_CARD_CTA,
  }
}

function cardBody(
  group: ProcessGroupRun,
  tone: ProcessStatusTone,
  merged: number,
): { body?: { text: string; tone: ProcessStatusTone } } {
  if (group.park) return { body: { text: group.park.message, tone } }
  const rejected = group.legs.filter((l) => l.status === 'rejected').length
  if (group.status === 'succeeded') {
    return {
      body: {
        text:
          rejected > 0
            ? `${PROCESS_RUN_WORDS.done} · ${merged} merged, ${rejected} rejected`
            : `${PROCESS_RUN_WORDS.done} · every project merged`,
        tone: 'done',
      },
    }
  }
  if (group.status === 'failed' && group.error) {
    return { body: { text: group.error, tone: 'stuck' } }
  }
  const ready = group.legs.filter((l) => l.status === 'at-sign-off').map((l) => l.projectId)
  if (ready.length > 0) {
    return {
      body: {
        text: `${andList(ready)} ${ready.length === 1 ? 'is' : 'are'} ready for sign-off`,
        tone: 'review',
      },
    }
  }
  return {}
}

/**
 * What the group run waits on the person for, and how they may answer: the
 * choices its park offers, and — to try a failed merge again — the leg, on the
 * mode it was merged with (merge when none) and the modes it may take.
 */
export function processGroupParkView(group: ProcessGroupRun): ProcessGroupParkView | undefined {
  const park = group.park
  if (group.status !== 'parked' || !park) return undefined
  const leg = park.legId ? group.legs.find((l) => l.id === park.legId) : undefined
  const retriesMerge = leg !== undefined && park.reason === 'integration-failed'
  return {
    message: park.message,
    ...(leg ? { leg } : {}),
    choices: processGroupParkChoices(park),
    toMerge: retriesMerge ? [{ leg, mode: leg.integrationMode ?? 'merge' }] : [],
    modes: retriesMerge ? processGroupLegIntegrationModes(group, leg.id) : [],
  }
}

/** The answer to send for a park choice, with the mode picked for a retried merge. */
export function processGroupResumeInput(
  choice: ProcessGroupResumeChoice,
  opts: { modes?: Record<string, ProcessIntegrationMode>; note?: string } = {},
): ProcessGroupResumeInput {
  const note = opts.note?.trim()
  return {
    choice,
    ...(note ? { note } : {}),
    ...(choice === 'retry-integration' && opts.modes && Object.keys(opts.modes).length > 0
      ? { integration: opts.modes }
      : {}),
  }
}

/** How long a group run (or one of its legs) has worked at `now`, live while a step runs. */
export function processGroupWorkMs(
  totals: { workMs: number; ticking: boolean; at: number } | undefined,
  now: number,
): number | undefined {
  if (!totals) return undefined
  return totals.workMs + (totals.ticking ? Math.max(0, now - totals.at) : 0)
}

const shortSha = (sha: string) => sha.slice(0, PROCESS_GROUP_SHORT_SHA_LENGTH)

function landedText(landing: NonNullable<ProcessGroupLeg['landedBy']>): string {
  return `On ${landing.baseRef} as ${shortSha(landing.commit)} — ${
    PROCESS_GROUP_LANDING_SOURCE_WORDS[landing.source]
  }`
}

/**
 * Whether an ended group run can be resumed, and what resuming starts — once
 * each merged prerequisite is rebuilt as its plan says (`rebuilds`, by leg id;
 * one not read yet is rebuilt only if needed), with why; or why it cannot yet
 * — a leg it would start still needs one not merged. Nothing for a group run
 * still going, cancelled, or with no leg left waiting. Pure.
 */
export function processGroupResumeView(
  group: ProcessGroupRun,
  rebuilds: Readonly<Record<string, ProcessGroupRebuildPlan>> = {},
): ProcessGroupResumeView | undefined {
  const refusal = processGroupReopenRefusal(group)
  if (
    refusal === PROCESS_GROUP_REOPEN_LIVE ||
    refusal === PROCESS_GROUP_REOPEN_CANCELLED ||
    refusal === PROCESS_GROUP_REOPEN_NOTHING
  ) {
    return undefined
  }
  if (refusal) return { canResume: false, reason: refusal }
  const plan = processGroupReopenPlan(group)
  const summary = processGroupRebuildSummary(plan.rebuilt.map((l) => plannedOf(l, rebuilds)))
  return {
    canResume: true,
    effect: processGroupStartWords(
      andList(plan.legs.map((l) => l.projectId)),
      plan.legs.length,
      summary,
      PROCESS_GROUP_RESUME_AGENT,
    ),
  }
}

/** The merged prerequisites resuming an ended group run rebuilds first — whose plans its Resume states. Pure. */
export function processGroupResumeRebuildLegIds(group: ProcessGroupRun | undefined): string[] {
  if (!group || processGroupReopenRefusal(group)) return []
  return processGroupReopenPlan(group).rebuilt.map((l) => l.id)
}

/** The leg whose rebuild plan marking it as landed states: a group run still going that has legs needing it. Pure. */
export function processGroupLandingPlanLegIds(
  group: ProcessGroupRun | undefined,
  legId: string,
): string[] {
  if (!group || PROCESS_RUN_TERMINAL_STATUSES.includes(group.status)) return []
  return group.legs.some((l) => l.dependsOn.includes(legId)) ? [legId] : []
}

/**
 * What marking a leg as landed leads to for the legs that need it: in a group
 * run still going, they start once it is rebuilt as `plan` says (only if
 * needed, while it is not read), with why; an ended one is resumed to start
 * them. Nothing when no leg needs it. Pure.
 */
export function processGroupLandedNextView(
  group: ProcessGroupRun,
  legId: string,
  plan?: ProcessGroupRebuildPlan,
): string | undefined {
  const dependents = group.legs.filter((l) => l.dependsOn.includes(legId))
  if (dependents.length === 0) return undefined
  const names = andList(dependents.map((l) => l.projectId))
  if (PROCESS_RUN_TERMINAL_STATUSES.includes(group.status))
    return PROCESS_GROUP_LANDED_RESUME_NEXT(names)
  const leg = group.legs.find((l) => l.id === legId)
  const summary = processGroupRebuildSummary([
    plannedOf(leg ?? { id: legId, projectId: legId }, plan ? { [legId]: plan } : {}),
  ])
  return processGroupStartWords(names, dependents.length, summary)
}

const plannedOf = (
  leg: Pick<ProcessGroupLeg, 'id' | 'projectId'>,
  rebuilds: Readonly<Record<string, ProcessGroupRebuildPlan>>,
): { projectId: string; plan?: ProcessGroupRebuildPlan } => {
  const plan = rebuilds[leg.id]
  return { projectId: leg.projectId, ...(plan ? { plan } : {}) }
}

/** A leg's landing check as a person reads it: the commit, where it is and how it was found — or every problem. Pure. */
export function processGroupLandingCheckView(
  check: ProcessGroupLegLandingCheck,
): ProcessGroupLandingCheckView {
  const landing = check.landing
  if (!landing) return { landed: false, lines: check.problems }
  return {
    landed: true,
    lines: [
      `Commit ${shortSha(landing.commit)}${landing.subject ? ` — “${landing.subject}”` : ''}`,
      `On ${landing.baseRef} — ${PROCESS_GROUP_LANDING_SOURCE_WORDS[landing.source]}`,
      PROCESS_GROUP_LANDING_FEATURES_DONE,
    ],
  }
}
