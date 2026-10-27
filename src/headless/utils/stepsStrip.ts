import type { Feature, ProcessRun, ProcessRunStopHolder } from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'

import { processStepAcceptedUnchecked } from './processAcceptedUnchecked'
import { processNodeBadge, processNodeState, processNodeTone } from './processView'
import type { ProcessStatusTone } from './processView'
import { acceptanceCriteriaLines } from './signoffPage'
import { statusKey, type StatusSemanticKey, type StoryStatus } from './status'
import { STEPS_STRIP_FULL_MAX, STEPS_STRIP_WHOLE_LABEL_MAX } from './stepsStripConstants'
import type {
  StepsStripEntry,
  StepsStripFitInput,
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

/**
 * How readily a step on a strip too narrow for it gives up room, as a flex
 * shrink factor: a short step never does, emphasised or not, and a long plain
 * one goes first. A long emphasised step keeps its name until the strip has
 * folded — before that the strip folds instead — and only then gives way. Pure.
 */
export function stepsStripShrink(
  entry: StepsStripEntry,
  emphasis: boolean,
  folded: boolean,
): 0 | 1 | 2 {
  if (entry.label.length <= STEPS_STRIP_WHOLE_LABEL_MAX) return 0
  if (emphasis) return folded ? 1 : 0
  return 2
}

/**
 * Whether a steps strip folds: always when narrow, else once its steps in full
 * were measured wider than the room it has — a phone never cuts a step. Pure.
 */
export function stepsStripFolds(input: StepsStripFitInput): boolean {
  if (input.narrow) return true
  if (input.fullWidth === undefined || input.room === undefined) return false
  return input.fullWidth > input.room + 1
}

/** What a strip's measured width belongs to: a change to any step's text measures it again. Pure. */
export function stepsStripMeasureKey(entries: readonly StepsStripEntry[]): string {
  return entries
    .map((e) => [e.key, e.label, e.phase, e.attempt ?? ''].join('\u0001'))
    .join('\u0002')
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
 * the fold, and a finished list anchors on its last step. The `✓ N done` chip
 * counts the steps in it that were accepted unchecked. Pure.
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
  const folded = entries.slice(0, anchor).filter((e) => e.phase === 'done')
  const doneCount = folded.length
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
      acceptedUnchecked: folded.filter((e) => e.acceptedUnchecked !== undefined).length,
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
 * agent manager has the stop. A step carried on past although it was never
 * proven is done in the gold of "Accepted unchecked", saying who accepted it. Pure.
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
    const accepted = nodeState === 'accepted' ? processStepAcceptedUnchecked(state) : undefined
    return {
      key: state.step.id,
      label: state.step.name,
      phase,
      tone: processNodeTone(nodeState, state.step.kind === 'gate'),
      ...(attempt ? { attempt } : {}),
      ...(accepted ? { acceptedUnchecked: accepted.line } : {}),
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
