import type {
  ProcessGroupLeg,
  ProcessGroupResumeChoice,
  ProcessGroupResumeInput,
  ProcessGroupRun,
  ProcessIntegrationMode,
} from 'thefactory-tools/types'
import {
  processGroupLegIntegrationModes,
  processGroupLegMergeGate,
  processGroupLegWaves,
  processGroupParkChoices,
} from 'thefactory-tools/utils'
import {
  PROCESS_GROUP_CARD_CTA,
  PROCESS_GROUP_LEG_OPEN_LABEL,
  PROCESS_GROUP_LEG_OPEN_LABELS,
  PROCESS_GROUP_LEG_STATUS_VIEW,
} from './processGroupViewConstants'
import type {
  ProcessGroupCardView,
  ProcessGroupLegRow,
  ProcessGroupParkView,
} from './processGroupViewTypes'
import { PROCESS_RUN_STATUS_VIEW, type ProcessStatusTone } from './processView'

const MERGED = ['integrated', 'rebuilding', 'rebuild-failed']

const legTitle = (group: ProcessGroupRun, id: string): string =>
  group.legs.find((l) => l.id === id)?.projectId ?? id

const andList = (names: readonly string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * How a group run reads in one word: a project ready for its own sign-off is
 * "Ready for you", the group's own stop or a project's ask "Waiting for you".
 */
export function processGroupBadge(group: Pick<ProcessGroupRun, 'status' | 'legs'>): {
  label: string
  tone: ProcessStatusTone
} {
  if (group.status === 'parked') return { label: 'Waiting for you', tone: 'on_hold' }
  if (group.status === 'running' || group.status === 'pending') {
    if (group.legs.some((l) => l.status === 'at-sign-off')) {
      return { label: 'Ready for you', tone: 'review' }
    }
    if (group.legs.some((l) => l.status === 'needs-you')) {
      return { label: 'Waiting for you', tone: 'on_hold' }
    }
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
 * merge waits for), and what opening its own run is for. Pure.
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
            ? `Finished · ${merged} merged, ${rejected} rejected`
            : 'Finished · every project merged',
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
