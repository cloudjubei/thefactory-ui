import type { Feature, ProcessRun, ProcessRunStopHolder } from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'

import { processNodeBadge, processNodeState, processNodeTone } from './processView'
import type { ProcessStatusTone } from './processView'
import { acceptanceCriteriaLines } from './signoffPage'
import { statusKey, type StatusSemanticKey, type StoryStatus } from './status'
import { STEPS_STRIP_FULL_MAX } from './stepsStripConstants'
import type {
  StepsStripEntry,
  StepsStripItem,
  StepsStripOptions,
  StepsStripPhase,
  StepsStripView,
} from './stepsStripTypes'

const STATUS_TONE: Record<StatusSemanticKey, ProcessStatusTone> = {
  queued: 'queued',
  working: 'working',
  done: 'done',
  stuck: 'stuck',
  onhold: 'on_hold',
  review: 'review',
}

/** The tone a story or feature status is drawn in. Pure. */
export function storyStatusTone(status: StoryStatus): ProcessStatusTone {
  return STATUS_TONE[statusKey(status)]
}

function workPhase(status: StoryStatus): StepsStripPhase {
  if (status === 'done' || status === 'reviewable') return 'done'
  return status === 'in_progress' ? 'current' : 'upcoming'
}

function anchorIndex(entries: readonly StepsStripEntry[]): number {
  const current = entries.findIndex((e) => e.phase === 'current')
  if (current >= 0) return current
  const next = entries.findIndex((e) => e.phase !== 'done')
  return next >= 0 ? next : entries.length - 1
}

function stepItem(entry: StepsStripEntry): StepsStripItem {
  return { kind: 'step', key: entry.key, entry, emphasis: entry.phase === 'current' }
}

/**
 * What a steps strip shows, left to right. A short list shows every step. A
 * long one — or any list on a narrow strip — folds: the finished steps before
 * the one the work is on become one `✓ N done` chip, that step stays in full
 * with its attempt pill, the next one follows on a wide strip, and the rest
 * become `+N more`. Without a current step the first unfinished one anchors
 * the fold, and a finished list anchors on its last step. Pure.
 */
export function stepsStripView(
  entries: readonly StepsStripEntry[],
  options: StepsStripOptions = {},
): StepsStripView {
  const narrow = options.narrow === true
  if (entries.length === 0) return { items: [], folded: false }
  if (!narrow && entries.length <= STEPS_STRIP_FULL_MAX) {
    return { items: entries.map(stepItem), folded: false }
  }
  const anchor = anchorIndex(entries)
  const doneCount = entries.slice(0, anchor).filter((e) => e.phase === 'done').length
  const after = entries.length - anchor - 1
  const showNext = !narrow && after > 0
  const rest = after - (showNext ? 1 : 0)
  const items: StepsStripItem[] = []
  if (doneCount > 0) {
    items.push({
      kind: 'done',
      key: 'done',
      label: narrow ? `✓ ${doneCount}/${entries.length}` : `✓ ${doneCount} done`,
      count: doneCount,
    })
  }
  items.push({ kind: 'step', key: entries[anchor].key, entry: entries[anchor], emphasis: true })
  if (showNext) items.push(stepItem(entries[anchor + 1]))
  if (rest > 0) {
    items.push({
      kind: 'more',
      key: 'more',
      label: narrow ? `+${rest}` : `+${rest} more`,
      count: rest,
    })
  }
  return { items, folded: true }
}

/**
 * A process run's steps as strip entries: the step it sits on — running or
 * parked — is current, steps it finished are done, and steps it has not reached
 * or will run again are upcoming. A retried step carries its attempt pill. The
 * step a run is stopped at reads as work going on while `stopHolder` says its
 * agent manager has the stop. Pure.
 */
export function processRunStripEntries(
  run: ProcessRun,
  stopHolder?: ProcessRunStopHolder,
): StepsStripEntry[] {
  const parkStepId = run.park?.stepId
  return processStepStates(run).map((state) => {
    const stopped = processNodeState(state, parkStepId)
    const nodeState = stopped === 'parked' && stopHolder === 'manager' ? 'working' : stopped
    const phase: StepsStripPhase =
      state.current || nodeState === 'parked' || nodeState === 'working'
        ? 'current'
        : nodeState === 'queued' || nodeState === 'requeued' || nodeState === 'rechecked'
          ? 'upcoming'
          : 'done'
    const attempt = processNodeBadge(state, run)
    return {
      key: state.step.id,
      label: state.step.name,
      phase,
      tone: processNodeTone(nodeState, state.step.kind === 'gate'),
      ...(attempt ? { attempt } : {}),
    }
  })
}

/**
 * A story's features as strip entries, named by their reference and title —
 * `#4.2 Approval preview`. A feature being built is current; a done or verified
 * one is done. Pure.
 */
export function storyStripEntries(
  story: { features: readonly Pick<Feature, 'id' | 'title' | 'status'>[] },
  featureRef: (featureId: string) => string,
): StepsStripEntry[] {
  return story.features.map((f) => ({
    key: f.id,
    label: `${featureRef(f.id)} ${f.title}`,
    phase: workPhase(f.status),
    tone: storyStatusTone(f.status),
  }))
}

/**
 * A feature's done-when criteria as strip entries — met once the feature is
 * done or verified, still to meet otherwise. Empty when it states none. Pure.
 */
export function featureStripEntries(
  feature: Pick<Feature, 'status' | 'acceptance'>,
): StepsStripEntry[] {
  const met = feature.status === 'done' || feature.status === 'reviewable'
  const tone: ProcessStatusTone = !met ? 'queued' : feature.status === 'done' ? 'done' : 'review'
  return acceptanceCriteriaLines(feature.acceptance).map((label, i) => ({
    key: `criterion-${i}`,
    label,
    phase: met ? 'done' : 'upcoming',
    tone,
  }))
}
