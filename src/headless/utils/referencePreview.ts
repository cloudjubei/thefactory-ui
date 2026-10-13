import type { ProcessRun, ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'
import {
  processRunBadge,
  processRunSpend,
  processRunWorkLabel,
  type ProcessStatusTone,
} from './processView'
import {
  REFERENCE_FOLDER_CAPTION,
  REFERENCE_KIND_CAPTIONS,
  REFERENCE_LOADING_CAPTION,
  REFERENCE_MISSING_CAPTION,
  REFERENCE_OPEN_LABELS,
  RUN_PREVIEW_ANSWER,
  RUN_PREVIEW_NEEDS,
  RUN_PREVIEW_OPEN_SIGNOFF,
  RUN_PREVIEW_STEP,
  RUN_PREVIEW_STORY,
  RUN_PREVIEW_TIME,
  RUN_PREVIEW_WAITING,
} from './referencePreviewConstants'
import type { ReferencePreview, RunReferencePreview } from './referencePreviewTypes'
import { isStoryStatus, statusKey, statusLabel, type StatusSemanticKey } from './status'

const STATUS_TONE: Record<StatusSemanticKey, ProcessStatusTone> = {
  queued: 'queued',
  working: 'working',
  done: 'done',
  stuck: 'stuck',
  onhold: 'on_hold',
  review: 'review',
}

function caption(description: ReferenceDescription): string {
  if (description.loading) return REFERENCE_LOADING_CAPTION
  if (description.missing) return REFERENCE_MISSING_CAPTION
  const folder = description.kind === 'file' && description.label.endsWith('/')
  const what = folder ? REFERENCE_FOLDER_CAPTION : REFERENCE_KIND_CAPTIONS[description.kind]
  return description.projectName ? `${what} in ${description.projectName}` : what
}

/** The label without the other project's name in front — the caption names it. */
function ownLabel(description: ReferenceDescription): string {
  const prefix = description.projectName ? `${description.projectName} ` : ''
  return prefix && description.label.startsWith(prefix)
    ? description.label.slice(prefix.length)
    : description.label
}

function statusPill(status: string | undefined): ReferencePreview['status'] {
  if (!status || !isStoryStatus(status)) return undefined
  return { label: statusLabel(status), tone: STATUS_TONE[statusKey(status)] }
}

/**
 * A reference's preview card, from how it is described: what it is, its
 * number and title, its status, the facts it carries, and the button that
 * opens it — none for what is gone or still being looked up. Pure.
 */
export function referencePreview(description: ReferenceDescription): ReferencePreview {
  const status = description.loading ? undefined : statusPill(description.status)
  const title = description.loading
    ? description.label
    : description.title
      ? `${ownLabel(description)} ${description.title}`
      : ownLabel(description)
  const lines =
    description.facts && !description.loading && !description.missing
      ? description.facts
      : description.detail && description.detail !== description.title
        ? [{ label: '', value: description.detail }]
        : []
  const openable = description.link && !description.missing && !description.loading
  return {
    caption: caption(description),
    title,
    ...(status ? { status } : {}),
    lines,
    ...(openable && description.link
      ? { primary: { label: REFERENCE_OPEN_LABELS[description.kind], link: description.link } }
      : {}),
  }
}

/** Where a parked run waits, or the step a working run is on, as its card's line. */
function whereLine(run: ProcessRun): { label: string; value: string } | undefined {
  const park = run.park
  if (run.status === 'parked' && park) {
    if (park.reason !== 'gate') return { label: RUN_PREVIEW_NEEDS, value: park.message }
    const step = run.plan.steps.find((s) => s.id === park.stepId)
    return step
      ? { label: RUN_PREVIEW_STEP, value: `${step.name} · ${RUN_PREVIEW_WAITING}` }
      : undefined
  }
  if (run.status !== 'running' && run.status !== 'pending') return undefined
  const current = processStepStates(run).find((s) => s.current)
  return current ? { label: RUN_PREVIEW_STEP, value: current.step.name } : undefined
}

/**
 * A process run's preview card, live: its live status, its story, where it
 * waits or what step it is on, its time and cost — and a button to its
 * sign-off, to answer it, or to open it. Pure.
 */
export function runReferencePreview(
  run: ProcessRun,
  options: { now: number; story?: string },
): RunReferencePreview {
  const where = whereLine(run)
  const time = [processRunWorkLabel(run, options.now), processRunSpend(run)?.label]
    .filter((part): part is string => !!part)
    .join(' · ')
  const link: ResourceLink = { kind: 'run', projectId: run.projectId, runId: run.id }
  const parked = run.status === 'parked' && run.park
  const open = !parked
    ? REFERENCE_OPEN_LABELS.run
    : run.park?.reason === 'gate'
      ? RUN_PREVIEW_OPEN_SIGNOFF
      : RUN_PREVIEW_ANSWER
  return {
    caption: REFERENCE_KIND_CAPTIONS.run,
    title: run.title,
    status: processRunBadge(run, options.now),
    lines: [
      ...(options.story ? [{ label: RUN_PREVIEW_STORY, value: options.story }] : []),
      ...(where ? [where] : []),
      ...(time ? [{ label: RUN_PREVIEW_TIME, value: time }] : []),
    ],
    primary: { label: open, link },
    offersChat: !run.parentRunId,
  }
}
