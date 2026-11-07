import { useEffect, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import {
  PROCESS_ACCEPT_REPORT_COPY,
  SIGNOFF_LOAD_FAILED,
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
  type ParkAnswerView,
  type ProcessIntegrationDecision,
  type ProcessIntegrationMode,
  type ProcessManagerEscalationView,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessVariantLane,
  type ProcessVariantReportView,
  type ProcessWorkBranch,
  type ProofKind,
  type ProofKindUnavailable,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { VerdictBadge, type SaveFileHandler } from '../chat/signoff'
import IntegrationChooser from './IntegrationChooser'
import ParkAnswers from './ParkAnswers'
import ParkNoteComposer from './ParkNoteComposer'
import ProcessVariantReport from './ProcessVariantReport'
import RunNeedsYouCard, { ManagerLine } from './RunNeedsYouCard'

export type RunReportReviewProps = {
  run: ProcessRun
  now: number
  choices?: readonly ProcessParkChoice[]
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
  integration?: ReactNode
  steps?: ReactNode
  details?: ReactNode
  /** Back to the lanes of a run of variants. */
  onOpenSteps?: () => void
  /** The final report's text once loaded, for the header's download. */
  onReportText?: (text: string | undefined) => void
  onOpenVariant: (lane: ProcessVariantLane) => void
  onCopy?: (text: string) => void
  onSaveFile?: SaveFileHandler
}

type DecisionStep = 'idle' | 'note' | 'integration'

/** Native peer of web's `RunReportReview`: a sign-off with no story, read from the run. */
export default function RunReportReview(props: RunReportReviewProps) {
  const { run, now, steps, details, onOpenSteps, onReportText, onOpenVariant, onCopy, onSaveFile } =
    props
  const { theme } = useNativeTheme()
  const evidence = useProcessRunEvidence(run.projectId, run.id)
  const view = processVariantReport(run, evidence.groups, now)
  const reportText = view.reportTile?.text
  useEffect(() => {
    onReportText?.(reportText)
  }, [reportText, onReportText])
  const top = evidence.loaded ? (
    <RunReportDecision {...props} view={view} />
  ) : (
    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
      {evidence.error ? `${SIGNOFF_LOAD_FAILED} — ${evidence.error}` : 'Reading what was filed…'}
    </Text>
  )
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <ProcessVariantReport
        view={view}
        projectId={run.projectId}
        top={top}
        onOpenVariant={onOpenVariant}
        {...(steps ? { steps } : {})}
        {...(onOpenSteps ? { onOpenSteps } : {})}
        {...(onCopy ? { onCopy } : {})}
        {...(onSaveFile ? { onSaveFile } : {})}
      />
      {details}
    </View>
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
  const { theme, status } = useNativeTheme()
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
  const notice = (accept ?? alreadyOnBase)?.notice
  return (
    <RunNeedsYouCard
      style={{ marginHorizontal: 0, marginTop: 0 }}
      tone="review"
      where={<VerdictBadge verdict={view.verdict} {...(view.tally ? { tally: view.tally } : {})} />}
      {...(onAskManager ? { onAskManager } : {})}
    >
      <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}>
        {view.headline}
      </Text>
      {integration}
      {notice ? (
        <View
          style={{
            padding: nativeSpace[3],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.text.primary }}>{notice}</Text>
        </View>
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
        <IntegrationChooser
          runId={run.id}
          workBranch={workBranch}
          {...(integrationModes ? { modes: integrationModes } : {})}
          busy={busy}
          onChoose={(decision) => decide('approve', undefined, decision)}
          onCancel={() => setStep('idle')}
        />
      ) : null}
      {error ? (
        <View
          style={{
            padding: nativeSpace[3],
            borderRadius: nativeRadii[3],
            backgroundColor: status.stuck.softBg,
          }}
        >
          <Text style={{ fontSize: 12.5, color: status.stuck.softFg }}>{error}</Text>
        </View>
      ) : null}
    </RunNeedsYouCard>
  )
}
