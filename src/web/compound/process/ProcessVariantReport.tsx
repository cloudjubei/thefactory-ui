import { useState, type ReactNode } from 'react'

import {
  PROCESS_VARIANT_COPY,
  processVariantChildView,
  useProcessRun,
  type EvidenceTile,
  type ProcessVariantFact,
  type ProcessVariantRecording,
  type ProcessVariantReportView,
  type ProcessVariantSection,
} from '../../../headless'
import { IconChevronRight, IconCopy, IconDocument } from '../../icons'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import WalkthroughTab from '../chat/signoff/WalkthroughTab'
import CheckChip from '../chips/CheckChip'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import RefChip from '../chips/RefChip'
import ToneBadge from '../chips/ToneBadge'
import Markdown from '../Markdown'
import ScriptStepLog from './ScriptStepLog'
import SignoffReportPanel from './signoff/SignoffReportPanel'

export type ProcessVariantReportProps = {
  view: ProcessVariantReportView
  projectId: string
  /** What leads the page: the decision, or what a stopped variant needs. */
  top?: ReactNode
  /** The run's steps, folded under their line. */
  steps?: ReactNode
  /** Back to the lanes, while the run is still working. */
  onOpenSteps?: () => void
  /** Open a section already, as a phone's push does on its own page. */
  initiallyOpen?: readonly string[]
}

const CARD = 'rounded-xl border border-(--border-subtle) bg-(--surface-raised)'
const CARD_HEAD = 'flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 py-3 sm:px-5'

/** A ref or patch of a variant, the way the launch card showed it. */
export function VariantFacts({ facts }: { facts: readonly ProcessVariantFact[] }) {
  if (facts.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {facts.map((fact) =>
        fact.kind === 'ref' ? (
          <RefChip key={fact.key} value={fact.text} kind="commit" />
        ) : (
          <span
            key={fact.key}
            className="inline-flex items-center gap-1 rounded-full border border-(--border-default) px-2 py-px text-[11.5px] text-(--text-secondary)"
          >
            <IconDocument className="size-3" />
            {fact.text}
          </span>
        ),
      )}
    </div>
  )
}

/** Whether a recording counts as proof, and if not, why. */
function ProofBadge({ recording }: { recording: ProcessVariantRecording }) {
  return (
    <span
      title={recording.title}
      className={`badge badge--soft badge--sm w-fit ${recording.proof ? 'badge--done' : 'badge--review'}`}
    >
      <span className={`badge__dot ${recording.proof ? '' : 'badge__dot--hollow'}`} />
      {recording.label}
    </span>
  )
}

/** Recordings in the order filed, each by its own label, with its proof badge. */
export function VariantRecordings({
  projectId,
  recordings,
}: {
  projectId: string
  recordings: readonly ProcessVariantRecording[]
}) {
  const byId = new Map(recordings.map((one) => [one.tile.ref.id, one]))
  const footer = (tile: EvidenceTile) => {
    const recording = byId.get(tile.ref.id)
    return recording ? <ProofBadge recording={recording} /> : null
  }
  return (
    <div className="flex flex-col gap-2">
      <WalkthroughTab
        projectId={projectId}
        recordings={recordings.map((one) => one.tile)}
        renderFooter={footer}
      />
    </div>
  )
}

/** The reports a variant filed, in the order filed, each by its own label. */
export function VariantFindings({ section }: { section: ProcessVariantSection }) {
  return (
    <div className="flex flex-col gap-3">
      {section.findings.map((one) => (
        <div key={one.key} className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-(--text-primary)">{one.title}</span>
          {one.text ? (
            <div className="text-[12.5px] leading-relaxed text-(--text-secondary)">
              <Markdown text={one.text} />
            </div>
          ) : null}
        </div>
      ))}
      {section.findingsNote ? (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-(--text-primary)">
            {PROCESS_VARIANT_COPY.review}
          </span>
          <span className="text-[12.5px] text-(--text-muted)">{section.findingsNote}</span>
        </div>
      ) : null}
    </div>
  )
}

/** The step log of each script step the variant's run reached. */
function VariantStepLogs({
  section,
  projectId,
}: {
  section: ProcessVariantSection
  projectId: string
}) {
  const { run } = useProcessRun(section.lane.runId)
  const { stepLogs } = processVariantChildView(run, section.tiles)
  if (stepLogs.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {stepLogs.map((log) => (
        <div
          key={log.stepId}
          className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-muted)"
        >
          <div className="flex items-center gap-2 px-4 pt-3">
            <span className="text-[13px] font-semibold text-(--text-primary)">{log.title}</span>
            <span className="text-[12px] text-(--text-muted)">{PROCESS_VARIANT_COPY.stepLog}</span>
          </div>
          <ScriptStepLog projectId={projectId} view={log.view} />
        </div>
      ))}
    </div>
  )
}

function VariantBody({
  section,
  projectId,
}: {
  section: ProcessVariantSection
  projectId: string
}) {
  const filed = section.recordings.length > 0 || section.findings.length > 0
  return (
    <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
      <VariantFacts facts={section.lane.facts} />
      {filed || section.findingsNote ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <VariantRecordings projectId={projectId} recordings={section.recordings} />
          <VariantFindings section={section} />
        </div>
      ) : (
        <span className="text-[12.5px] text-(--text-muted)">
          {PROCESS_VARIANT_COPY.nothingFiled}
        </span>
      )}
      <VariantStepLogs section={section} projectId={projectId} />
    </div>
  )
}

function VariantRow({
  section,
  projectId,
  defaultOpen,
}: {
  section: ProcessVariantSection
  projectId: string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const { lane } = section
  return (
    <div className="border-t border-(--border-subtle)">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={lane.label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v)
        }}
        className="flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-(--surface-hover) sm:px-5"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-(--text-primary)">
              {lane.label}
            </span>
            <ToneBadge tone={lane.badge.tone}>{lane.badge.label}</ToneBadge>
          </span>
          <span className="truncate text-[12px] text-(--text-secondary)">{lane.line}</span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <CheckChip
            inert
            row={{ id: 'walkthrough', label: lane.chip.label, state: lane.chip.state }}
          />
          {lane.time ? <DurationChip label={lane.time} nested /> : null}
          {lane.cost ? <CostChip label={lane.cost} nested /> : null}
        </span>
        <IconChevronRight
          className={`size-3.5 shrink-0 text-(--text-secondary) transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </div>
      {open ? <VariantBody section={section} projectId={projectId} /> : null}
    </div>
  )
}

/** A variant's own page: how it stands, then what it filed and its step logs. */
export function ProcessVariantPage({
  section,
  projectId,
}: {
  section: ProcessVariantSection
  projectId: string
}) {
  const { lane } = section
  return (
    <>
      <section aria-label={lane.label} className={`${CARD} mx-3 mt-3`}>
        <div className="flex flex-col gap-2 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">{lane.label}</h3>
          </div>
          <VariantFacts facts={lane.facts} />
          <span className="text-[12.5px] text-(--text-secondary)">{lane.line}</span>
        </div>
      </section>
      <section aria-label={PROCESS_VARIANT_COPY.recordings} className={`${CARD} mx-3 mt-3`}>
        <div className={CARD_HEAD}>
          <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">
            {PROCESS_VARIANT_COPY.recordings}
          </h3>
          <span className="text-[12.5px] text-(--text-muted)">
            {PROCESS_VARIANT_COPY.countAsProof(lane.proof.count, lane.proof.total)}
          </span>
        </div>
        <VariantBody section={{ ...section, lane: { ...lane, facts: [] } }} projectId={projectId} />
      </section>
    </>
  )
}

/** The final report and the post filed beside it. */
function ReportDoc({ view }: { view: ProcessVariantReportView }) {
  const [doc, setDoc] = useState<'report' | 'post'>('report')
  const post = view.post
  return (
    <div className="flex flex-col gap-2 px-4 pb-3 sm:px-5">
      {post ? (
        <div className="flex items-center gap-2">
          <SegmentedControl
            size="sm"
            ariaLabel={PROCESS_VARIANT_COPY.finalReport}
            value={doc}
            onChange={(next) => setDoc(next as 'report' | 'post')}
            options={[
              { value: 'report', label: PROCESS_VARIANT_COPY.report },
              { value: 'post', label: PROCESS_VARIANT_COPY.post },
            ]}
          />
          {doc === 'post' && post.text && typeof navigator !== 'undefined' ? (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-1.5"
              onClick={() => void navigator.clipboard?.writeText(post.text ?? '')}
            >
              <IconCopy className="size-3.5" />
              {PROCESS_VARIANT_COPY.copy}
            </Button>
          ) : null}
        </div>
      ) : null}
      {doc === 'post' && post ? (
        <div className="text-[13px] leading-relaxed text-(--text-secondary)">
          <Markdown text={post.text ?? ''} />
        </div>
      ) : view.report ? (
        <SignoffReportPanel view={view.report} />
      ) : null}
    </div>
  )
}

/**
 * A run's report, by variant: what leads the page, the final report, then a
 * section per variant with its recordings and reviews. Everything is read from
 * the run itself, so a run with no story has one too.
 */
export default function ProcessVariantReport({
  view,
  projectId,
  top,
  steps,
  onOpenSteps,
  initiallyOpen = [],
}: ProcessVariantReportProps) {
  return (
    <div className="flex flex-col gap-3">
      {top}
      {steps}
      <section aria-label={PROCESS_VARIANT_COPY.finalReport} className={CARD}>
        <div className={CARD_HEAD}>
          <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">
            {PROCESS_VARIANT_COPY.finalReport}
          </h3>
          {view.waiting?.sub ? (
            <span className="text-[12.5px] text-(--text-muted)">{view.waiting.sub}</span>
          ) : null}
          {onOpenSteps ? (
            <button
              type="button"
              onClick={onOpenSteps}
              className="ml-auto text-[12.5px] font-medium text-(--accent-primary) hover:underline"
            >
              {PROCESS_VARIANT_COPY.lanes}
            </button>
          ) : null}
        </div>
        {view.waiting ? (
          <div className="px-4 pb-3 text-[12.5px] text-(--text-secondary) sm:px-5">
            {view.waiting.line}
          </div>
        ) : (
          <ReportDoc view={view} />
        )}
      </section>
      {view.sections.length > 0 ? (
        <section aria-label={PROCESS_VARIANT_COPY.heading} className={CARD}>
          <div className={CARD_HEAD}>
            <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">
              {PROCESS_VARIANT_COPY.heading}
            </h3>
            <span className="text-[12.5px] text-(--text-muted)">
              {PROCESS_VARIANT_COPY.recordingsAndReviews}
            </span>
          </div>
          {view.sections.map((section) => (
            <VariantRow
              key={section.lane.id}
              section={section}
              projectId={projectId}
              defaultOpen={initiallyOpen.includes(section.lane.id)}
            />
          ))}
        </section>
      ) : null}
      {view.recordings.length > 0 ? (
        <section aria-label={PROCESS_VARIANT_COPY.recordings} className={CARD}>
          <div className={CARD_HEAD}>
            <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">
              {PROCESS_VARIANT_COPY.recordings}
            </h3>
            <span className="text-[12.5px] text-(--text-muted)">
              {PROCESS_VARIANT_COPY.countAsProof(
                view.recordings.filter((one) => one.proof).length,
                view.recordings.length,
              )}
            </span>
          </div>
          <div className="px-4 pb-4 sm:px-5">
            <VariantRecordings projectId={projectId} recordings={view.recordings} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
