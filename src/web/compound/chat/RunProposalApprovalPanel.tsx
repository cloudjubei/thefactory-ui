import { useState } from 'react'

import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { IconChevronDown, IconMaximize } from '../../icons'
import {
  RUN_PROPOSAL_COLLAPSE_LABEL,
  RUN_PROPOSAL_DECLINE_LABEL,
  RUN_PROPOSAL_EXPAND_LABEL,
  RUN_PROPOSAL_LATER_LABEL,
  RUN_PROPOSAL_OPEN_FULL_LABEL,
  runProposalArgs,
  runProposalHostDetail,
  runProposalLandingEdits,
  runProposalLandingForm,
  runProposalLandingProblem,
  runProposalStepName,
  runProposalToolName,
  runProposalView,
  useStories,
} from '../../../headless'
import type {
  PendingToolGrant,
  ProcessIntegrationForm,
  RunProposalSection,
  RunProposalView,
} from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import Markdown from '../Markdown'
import DependencyBullet from '../stories/DependencyBullet'
import RunProposalLandingEditor from './RunProposalLandingEditor'

export type RunProposalApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

const KIND_TONE: Record<RunProposalView['tone'], string> = {
  review: 'badge--review',
  working: 'badge--working',
  done: 'badge--done',
  stuck: 'badge--stuck',
}

/** One section's whole content: its words, its numbered criteria, its proof chips. */
function SectionBody({ section }: { section: RunProposalSection }) {
  return (
    <div className="flex flex-col gap-1.5 text-[12.5px] text-(--text-secondary)">
      {section.chips ? (
        <div className="flex flex-wrap gap-1">
          {section.chips.map((chip) => (
            <span key={chip} className="badge badge--soft badge--sm">
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      {section.items ? (
        <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
          {section.items.map((item) => (
            <li key={item}>
              <Markdown text={item} inline />
            </li>
          ))}
        </ol>
      ) : null}
      {section.markdown ? <Markdown text={section.markdown} /> : null}
      {!section.chips && !section.items && !section.markdown ? (
        <span>{section.summary}</span>
      ) : null}
    </div>
  )
}

/** A section closed to its label and one line, opened in place. */
function FoldedSection({ section }: { section: RunProposalSection }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-(--border-subtle) first:border-t-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-1.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="shrink-0 text-[12px] font-semibold text-(--text-primary)">
          {section.label}
        </span>
        {open ? null : (
          <span className="min-w-0 flex-1 truncate text-[12px] text-(--text-secondary)">
            {section.summary}
          </span>
        )}
        <IconChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-(--text-muted) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="pb-2">
          <SectionBody section={section} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Approving a run chat's proposal — a change staged on the run, a feature
 * added to it, the staged changes started, a decision on a "Needs you" item.
 * Pinned in place of the composer, so it stays small: its kind, subject and
 * one-line effect with the decision buttons always in reach; the details open
 * below it in a bounded scroll, each section closed to one line, or whole in a
 * wider view for reading.
 */
export default function RunProposalApprovalPanel({
  grant,
  onDecideLater,
}: RunProposalApprovalPanelProps) {
  const { stories } = useStories()
  const args = runProposalArgs(grant)
  const featureId = runProposalView(runProposalToolName(grant), args)?.featureId
  const story = featureId
    ? stories.find((s) => s.features.some((f) => f.id === featureId))
    : undefined
  const feature = story?.features.find((f) => f.id === featureId)
  const view = runProposalView(
    runProposalToolName(grant),
    args,
    feature?.title ?? runProposalStepName(grant),
    runProposalHostDetail(grant),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [reading, setReading] = useState(false)
  const [landingForm, setLandingForm] = useState<ProcessIntegrationForm | undefined>(() =>
    view?.landing ? runProposalLandingForm(view.landing) : undefined,
  )
  if (!view) return null
  const landingProblem =
    landingForm && view.landing?.options
      ? runProposalLandingProblem(landingForm, view.landing.options)
      : undefined

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const edits =
      decision === 'once' && view.landing && landingForm
        ? runProposalLandingEdits(view.landing, landingForm)
        : undefined
    void grant.decide(decision, edits).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
        {RUN_PROPOSAL_LATER_LABEL}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
        {RUN_PROPOSAL_DECLINE_LABEL}
      </Button>
      <Button
        size="sm"
        variant={view.danger ? 'danger' : 'primary'}
        onClick={() => decide('once')}
        loading={busy}
        disabled={landingProblem !== undefined}
      >
        {view.approveLabel}
      </Button>
    </div>
  )

  const subject = (
    <>
      <span className={`badge badge--soft badge--sm shrink-0 ${KIND_TONE[view.tone]}`}>
        {view.kindLabel}
      </span>
      {story && feature ? (
        <DependencyBullet dependency={`${story.id}.${feature.id}`} interactive />
      ) : null}
      {view.storyId ? <DependencyBullet dependency={view.storyId} interactive /> : null}
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-(--text-primary)">
        {view.title}
      </span>
    </>
  )

  return (
    <div className="m-3 flex max-h-[min(55vh,480px)] min-h-0 flex-col overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-raised)">
      <div className="flex shrink-0 flex-col gap-1 border-b border-(--border-subtle) bg-(--surface-base) px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {subject}
          <Button
            variant="ghost"
            size="icon"
            aria-label={RUN_PROPOSAL_OPEN_FULL_LABEL}
            title={RUN_PROPOSAL_OPEN_FULL_LABEL}
            onClick={() => setReading(true)}
          >
            <IconMaximize className="h-3.5 w-3.5" />
          </Button>
        </div>
        <span className="truncate text-[12px] text-(--text-secondary)" title={view.effect}>
          {view.effect}
        </span>
      </div>
      {view.landing ? (
        <div className="max-h-[260px] shrink-0 overflow-y-auto border-b border-(--border-subtle) px-3">
          <RunProposalLandingEditor
            landing={view.landing}
            form={landingForm}
            busy={busy}
            onChange={setLandingForm}
          />
        </div>
      ) : null}
      {view.sections.length > 0 ? (
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-left text-[12px] font-medium text-(--accent-primary)"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? RUN_PROPOSAL_COLLAPSE_LABEL : RUN_PROPOSAL_EXPAND_LABEL}
          <IconChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      ) : null}
      {expanded ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          {view.sections.map((section) => (
            <FoldedSection key={section.key} section={section} />
          ))}
        </div>
      ) : null}
      <div className="flex shrink-0 flex-col gap-1.5 border-t border-(--border-subtle) px-3 py-2">
        {error !== null ? (
          <div className="rounded-md border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-2.5 py-1.5 text-[12px] text-(--status-stuck-soft-fg)">
            {error}
          </div>
        ) : null}
        {actions}
      </div>
      {reading ? (
        <Modal
          isOpen
          onClose={() => setReading(false)}
          title={<span className="flex min-w-0 items-center gap-2">{subject}</span>}
          size="lg"
          footer={actions}
        >
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[13px] text-(--text-secondary)">{view.effect}</p>
            {view.sections.map((section) => (
              <section key={section.key} className="flex flex-col gap-1">
                <h4 className="m-0 text-[12px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  {section.label}
                </h4>
                <SectionBody section={section} />
              </section>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
