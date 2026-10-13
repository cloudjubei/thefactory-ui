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
  processRunClosureRowsProblem,
  runProposalEditArgs,
  runProposalEditStart,
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
  RunProposalEditState,
  RunProposalView,
} from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import Markdown from '../Markdown'
import DependencyBullet from '../stories/DependencyBullet'
import RunProposalLandingEditor from './RunProposalLandingEditor'
import RunProposalEditPanel from './RunProposalEditPanel'
import ToolAskCard from './ToolAskCard'
import { runProposalAskView, toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'

export type RunProposalApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The proposal was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
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
 * added to it, the staged changes started, a decision on a "Needs you" item —
 * on the shared tool-ask card, in place of the composer: its kind in the
 * header, its subject as the headline, what approving does as the
 * consequence, the decision buttons always in reach; the details open in the
 * card's bounded scroll, each section closed to one line, or whole in a wider
 * view for reading.
 */
export default function RunProposalApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
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
  const [editState, setEditState] = useState<RunProposalEditState | undefined>(() =>
    view?.edit ? runProposalEditStart(view.edit, runProposalHostDetail(grant)) : undefined,
  )
  if (!view) return null
  const askView = runProposalAskView(view, args)
  const editProblem = editState?.closure
    ? processRunClosureRowsProblem(editState.closure)
    : undefined
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
    const actionArgs = decision === 'once' && editState ? runProposalEditArgs(editState) : {}
    const sent =
      Object.keys(actionArgs).length > 0
        ? { args: { ...(edits?.args ?? {}), ...actionArgs } }
        : edits
    grant
      .decide(decision, sent)
      .then(() => onDecided?.(toolAskDecidedLine(askView, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={view.danger ? 'danger' : 'primary'}
        onClick={() => decide('once')}
        loading={busy}
        disabled={busy || landingProblem !== undefined || editProblem !== undefined}
      >
        {view.approveLabel}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
        {RUN_PROPOSAL_DECLINE_LABEL}
      </Button>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onDecideLater} disabled={busy}>
        {RUN_PROPOSAL_LATER_LABEL}
      </Button>
    </div>
  )

  const bullets =
    (story && feature) || view.storyId ? (
      <>
        {story && feature ? (
          <DependencyBullet dependency={`${story.id}.${feature.id}`} interactive />
        ) : null}
        {view.storyId ? <DependencyBullet dependency={view.storyId} interactive /> : null}
      </>
    ) : null

  return (
    <div className="m-3 flex max-h-[min(70vh,640px)] min-h-0 flex-col">
      <ToolAskCard
        view={askView}
        busy={busy}
        error={error}
        ready={landingProblem === undefined}
        {...(editProblem !== undefined ? { problem: editProblem } : {})}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
        headerAction={
          <button
            type="button"
            aria-label={RUN_PROPOSAL_OPEN_FULL_LABEL}
            title={RUN_PROPOSAL_OPEN_FULL_LABEL}
            onClick={() => setReading(true)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--surface-raised)"
          >
            <IconMaximize className="h-3.5 w-3.5" />
          </button>
        }
      >
        {bullets ? (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-2.5">
            {bullets}
            <span className="min-w-0 truncate text-[13.5px] font-semibold text-(--text-primary)">
              {view.title}
            </span>
          </div>
        ) : null}
        {view.landing ? (
          <div className="rounded-lg border border-(--border-subtle) px-3">
            <RunProposalLandingEditor
              landing={view.landing}
              form={landingForm}
              busy={busy}
              onChange={setLandingForm}
            />
          </div>
        ) : null}
        {view.edit && editState ? (
          <div className="rounded-lg border border-(--border-subtle) px-3">
            <RunProposalEditPanel
              edit={view.edit}
              state={editState}
              busy={busy}
              onChange={setEditState}
            />
          </div>
        ) : null}
        {view.sections.length > 0 ? (
          <div className="flex flex-col">
            <button
              type="button"
              className="flex w-fit items-center gap-1 py-0.5 text-left text-[12px] font-medium text-(--accent-primary)"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? RUN_PROPOSAL_COLLAPSE_LABEL : RUN_PROPOSAL_EXPAND_LABEL}
              <IconChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded ? (
              <div className="flex flex-col">
                {view.sections.map((section) => (
                  <FoldedSection key={section.key} section={section} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </ToolAskCard>
      {reading ? (
        <Modal
          isOpen
          onClose={() => setReading(false)}
          title={
            <span className="flex min-w-0 items-center gap-2">
              <span className={`badge badge--soft badge--sm shrink-0 ${KIND_TONE[view.tone]}`}>
                {view.kindLabel}
              </span>
              {bullets}
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-(--text-primary)">
                {view.title}
              </span>
            </span>
          }
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
