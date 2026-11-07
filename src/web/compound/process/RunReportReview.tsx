import { useEffect, useState, type ReactNode } from 'react'

import {
  choiceTakesNote,
  isResumeParkChoice,
  processAlreadyOnBaseSignOff,
  processNothingToMergeSignOff,
  processParkAnswersView,
  processVariantReport,
  requestProofChoices,
  soleIntegrationMode,
  useProcessIntegrationOptions,
  useProcessRunEvidence,
  PROCESS_ACCEPT_REPORT_COPY,
  SIGNOFF_LOAD_FAILED,
  type ParkAnswerView,
  type ProcessIntegrationDecision,
  type ProcessIntegrationMode,
  type ProcessManagerEscalationView,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessVariantReportView,
  type ProcessWorkBranch,
  type ProofKind,
  type ProofKindUnavailable,
} from '../../../headless'
import { VerdictBadge } from '../chat/signoff'
import IntegrationChooser from './IntegrationChooser'
import ParkAnswers from './ParkAnswers'
import ParkNoteComposer from './ParkNoteComposer'
import ProcessVariantReport from './ProcessVariantReport'
import RunNeedsYouCard, { ManagerLine } from './RunNeedsYouCard'

export type RunReportReviewProps = {
  run: ProcessRun
  now: number
  /** The gate's decision choices. */
  choices?: readonly ProcessParkChoice[]
  /** Set when approving must say how the work comes in. */
  workBranch?: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>
  integrationModes?: readonly ProcessIntegrationMode[]
  onChoose?: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => Promise<boolean>
  error?: string | null
  manager?: ProcessManagerEscalationView
  onAskManager?: () => void
  proofUnavailable?: readonly ProofKindUnavailable[]
  /** What bringing the work in came to, shown inside the decision. */
  integration?: ReactNode
  /** The run's steps, folded under their line, right below the decision. */
  steps?: ReactNode
  /** "More about this run", last. */
  details?: ReactNode
  /** Back to the lanes of a run of variants. */
  onOpenSteps?: () => void
  /** The final report's text once loaded, for the header's download. */
  onReportText?: (text: string | undefined) => void
}

type DecisionStep = 'idle' | 'note' | 'integration'

/**
 * A sign-off with no story: the decision over what the run itself filed, read
 * from the run. When its work branch changed nothing it is a report to accept:
 * the decision says so and no way of merging is asked for.
 */
export default function RunReportReview(props: RunReportReviewProps) {
  const { run, now, steps, details, onOpenSteps, onReportText } = props
  const evidence = useProcessRunEvidence(run.projectId, run.id)
  const view = processVariantReport(run, evidence.groups, now)
  const reportText = view.reportTile?.text
  useEffect(() => {
    onReportText?.(reportText)
  }, [reportText, onReportText])
  const top = evidence.loaded ? (
    <RunReportDecision {...props} view={view} />
  ) : (
    <div className="text-[12px] text-(--text-secondary)">
      {evidence.error ? `${SIGNOFF_LOAD_FAILED} — ${evidence.error}` : 'Reading what was filed…'}
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      <ProcessVariantReport
        view={view}
        projectId={run.projectId}
        top={top}
        {...(steps ? { steps } : {})}
        {...(onOpenSteps ? { onOpenSteps } : {})}
      />
      {details}
    </div>
  )
}

export function RunReportDecision({
  run,
  choices,
  workBranch,
  integrationModes,
  onChoose,
  error,
  manager,
  onAskManager,
  proofUnavailable,
  integration,
  view,
}: RunReportReviewProps & { view: ProcessVariantReportView }) {
  const [step, setStep] = useState<DecisionStep>('idle')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | undefined>()
  const reads = workBranch && !workBranch.shadow
  const { options, error: optionsError } = useProcessIntegrationOptions(reads ? run.id : undefined)
  const accept = workBranch
    ? processNothingToMergeSignOff(workBranch, options?.nothingToMerge, integrationModes)
    : undefined
  const alreadyOnBase =
    workBranch && !accept
      ? processAlreadyOnBaseSignOff(workBranch, options?.alreadyOnBase, integrationModes)
      : undefined
  const soleMode = workBranch?.shadow
    ? soleIntegrationMode(workBranch, integrationModes)
    : undefined
  const decide = (
    choice: ProcessResumeChoice,
    note?: string,
    decision?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => {
    if (!onChoose) return
    setBusy(true)
    void onChoose(choice, note, decision, requestedProof)
      .then((ok) => {
        if (ok) setStep('idle')
      })
      .finally(() => setBusy(false))
  }
  const offered = (choices ?? []).filter(isResumeParkChoice).map((c) =>
    c.choice === 'approve'
      ? {
          ...c,
          label:
            accept?.approveLabel ??
            alreadyOnBase?.approveLabel ??
            PROCESS_ACCEPT_REPORT_COPY.approveRun,
          detail: accept?.approveDoes ?? PROCESS_ACCEPT_REPORT_COPY.approveRunDoes,
        }
      : c,
  )
  // Until it is known whether anything merges, Approve would ask the wrong question.
  const read = !reads || options !== undefined || optionsError !== null
  const canDecide = offered.length > 0 && onChoose !== undefined && read
  const answers = processParkAnswersView(offered, manager, selected)
  const send = (answer: ParkAnswerView, note: string | undefined) => {
    if (answer.choice === 'approve' && workBranch) {
      const settled = accept?.decision ?? alreadyOnBase?.decision
      if (settled) return decide('approve', note, settled)
      if (soleMode) return decide('approve', note, { mode: soleMode })
      return setStep('integration')
    }
    if (!note && choiceTakesNote(answer.choice)) return setStep('note')
    decide(answer.choice as ProcessResumeChoice, note)
  }
  return (
    <RunNeedsYouCard
      className=""
      tone="review"
      where={<VerdictBadge verdict={view.verdict} {...(view.tally ? { tally: view.tally } : {})} />}
      {...(onAskManager ? { onAskManager } : {})}
    >
      <div className="text-[17px] font-semibold leading-snug text-(--text-primary)">
        {view.headline}
      </div>
      {integration}
      {(accept ?? alreadyOnBase) ? (
        <div
          role="note"
          className="rounded-lg border border-(--border-subtle) bg-(--surface-muted) px-3 py-2.5 text-[13px] text-(--text-primary)"
        >
          {(accept ?? alreadyOnBase)?.notice}
        </div>
      ) : null}
      {manager ? <ManagerLine view={manager} /> : null}
      {canDecide && step === 'idle' ? (
        <ParkAnswers
          view={answers}
          busy={busy}
          onSelect={setSelected}
          onSend={send}
          onOwnAnswer={() => setStep('note')}
        />
      ) : null}
      {canDecide && step === 'note' ? (
        <ParkNoteComposer
          proofChoices={requestProofChoices(proofUnavailable)}
          onSend={(note, requestedProof) =>
            decide('request-changes', note, undefined, requestedProof)
          }
          onCancel={() => setStep('idle')}
        />
      ) : null}
      {canDecide && step === 'integration' && workBranch ? (
        <div className="rounded-lg border border-(--status-review-soft-border) bg-(--status-review-soft-bg) p-3">
          <IntegrationChooser
            runId={run.id}
            workBranch={workBranch}
            {...(integrationModes ? { modes: integrationModes } : {})}
            busy={busy}
            onChoose={(decision) => decide('approve', undefined, decision)}
            onCancel={() => setStep('idle')}
          />
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-3 py-2 text-[12.5px] text-(--status-stuck-soft-fg)"
        >
          {error}
        </div>
      ) : null}
    </RunNeedsYouCard>
  )
}
