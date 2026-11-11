import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProcessRunFeatureSplit } from 'thefactory-tools/types'

import {
  accessRecordProjectNames,
  acceptanceCriteriaLines,
  aggregateTestCounts,
  capabilitySetupHandler,
  capabilitySetupOffered,
  choiceTakesNote,
  codeReviewView,
  evidenceChipForTab,
  evidenceLoadState,
  isEvidenceChipSelected,
  isResumeParkChoice,
  judgeAcceptance,
  overlayPairsFor,
  processAlreadyOnBaseSignOff,
  processNothingToMergeSignOff,
  processParkAnswersView,
  ranReviewChecks,
  requestChangesProofPreset,
  requestProofChoices,
  screensDecisionNote,
  screensDecisionUiImpact,
  reviewCheckGroups,
  reviewTabOrder,
  reviewTabs,
  signoffAttentionItems,
  signoffDecisionItems,
  signoffEvidenceChips,
  signoffFeatureRow,
  signoffFeaturesDelivered,
  signoffLoadingLabel,
  signoffFixSectionProps,
  signoffProofRecordings,
  signoffProofRows,
  signoffRecordingsProofLine,
  signoffRowsWithRecordings,
  signoffReportView,
  signoffRequestOutcome,
  signoffSectionProps,
  signoffSections,
  signoffVerifyViews,
  soleIntegrationMode,
  sumAcceptanceJudgements,
  EMPTY_SIGNOFF_SECTION,
  SIGNOFF_APPROVE_LABEL,
  SIGNOFF_LOAD_FAILED,
  SIGNOFF_SECTION_TITLES,
  uiChangeScopeOf,
  useProjects,
  useProcessIntegrationOptions,
  useProjectChecks,
  useReviewEvidence,
  useRunChatDraft,
  useRunWalkthrough,
  useStories,
  useStorySignoff,
  type AcceptanceJudgement,
  type CheckMethodId,
  type EvidenceLoadState,
  type ProcessIntegrationDecision,
  type ProcessIntegrationMode,
  type ProcessDroppedChangeAcceptedRow,
  type ParkAnswerView,
  type ProcessManagerEscalationView,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type SignoffEvidenceChip,
  type SignoffMergeHold,
  type ProcessWorkBranch,
  type ProofKind,
  type ChangeScreensDecision,
  type ProofKindUnavailable,
  type ReviewTabId,
  type ScreenPair,
  type SignoffFeatureRowView,
  type SignoffSection,
  type SignoffStepTarget,
  type StorySignoff,
  type UseReviewEvidence,
  useRunNeedsYou,
} from '../../../headless'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { IconChevronRight } from '../../icons'
import type { ChatAttachmentFile, ProjectChecksListing } from '../../../headless/api'
import CheckChip from '../chips/CheckChip'
import SetUpWithAgentButton from '../chips/SetUpWithAgentButton'
import {
  ChecksTab,
  ComparisonOverlay,
  DurCostChips,
  IdChip,
  ScreensTab,
  VerdictBadge,
  WalkthroughTab,
  type SaveFileHandler,
} from '../chat/signoff'
import ProjectFlakesList from './ProjectFlakesList'
import DependencyRef from '../stories/DependencyRef'
import FeatureReviewSection from './FeatureReviewSection'
import IntegrationChooser from './IntegrationChooser'
import ParkAnswers from './ParkAnswers'
import ParkNoteComposer from './ParkNoteComposer'
import RunNeedsYouCard, { ManagerLine } from './RunNeedsYouCard'
import ProofPlanMarks from './ProofPlanMarks'
import ScreensDecisionNote from './ScreensDecisionNote'
import CodeReviewPanel from './signoff/CodeReviewPanel'
import LoomWalkthroughPanel from './signoff/LoomWalkthroughPanel'
import Pill from './signoff/Pill'
import SignoffDecisionList from './signoff/SignoffDecisionList'
import { RunTicketPostNote } from './signoff/TicketPostNote'
import SignoffReportPanel from './signoff/SignoffReportPanel'
import StorySpecCard from './signoff/StorySpecCard'

/** A group leg that cannot merge yet, and the way to its group run. */
export type StorySignoffMergeHold = SignoffMergeHold & { onOpenGroup?: () => void }

/** A chip set after the evidence chips, and what opens behind it: a group's output. */
export type StorySignoffExtraChip = {
  key: string
  row: SignoffEvidenceChip['row']
  content: ReactNode
}

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** The story run being signed off — each feature shows where its run under it stands. */
  storyRunId: string
  /** What the run moved out of its features into follow-ups, said under each feature's criteria. */
  featureSplits?: readonly ProcessRunFeatureSplit[]
  /** The gate's decision choices — the decision bar acts on the whole story. */
  choices?: readonly ProcessParkChoice[]
  /** Set when approving must say how the work comes in — the run's work branch. */
  workBranch?: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>
  /** The only ways approving may bring the work in, when they are narrowed (`processRunIntegrationModes`). */
  integrationModes?: readonly ProcessIntegrationMode[]
  /** Answer the gate; resolves `false` when refused — the reason is then in `error`. */
  onChoose?: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => Promise<boolean>
  /** Why the last decision was refused, said where it was made. */
  error?: string | null
  /** A group leg that cannot merge yet — no Approve, and why. */
  mergeHold?: StorySignoffMergeHold
  /** The final report's text once loaded — for the header's download. */
  onReportText?: (text: string | undefined) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
  /** The app's file picker, for a Loom walkthrough's video; without it a step takes a link alone. */
  pickLoomVideo?: () => Promise<ChatAttachmentFile[]>
  /** Open a step's output on its own screen — the fix pass chip's target. */
  onOpenStep?: (target: SignoffStepTarget) => void
  /** What proof the run cannot produce here: never preset for a request for changes, and never choosable. */
  proofUnavailable?: readonly ProofKindUnavailable[]
  /** The files of the story's change that alter what users see; empty, and screens are never preset. */
  changeUiPaths?: readonly string[]
  /** Whether the story's change must be shown on screen, what decided it and why. */
  changeScreensDecision?: ChangeScreensDecision
  /** Each change the run accepted as dropped on purpose (`processDroppedChangeRows`), listed with what needs a look. */
  droppedAccepted?: readonly ProcessDroppedChangeAcceptedRow[]
  /** The manager's card when it handed the sign-off over: its word on it and the answers it prepared. */
  manager?: ProcessManagerEscalationView
  /** Open the run's chat to ask the manager about the decision. */
  onAskManager?: () => void
  /** What bringing the work in came to — shown inside the decision. */
  integration?: ReactNode
  /** The run's steps, folded under their line — right below the decision. */
  steps?: ReactNode
  /** "More about this run" — last. */
  details?: ReactNode
  /** Chips set beside the evidence chips, each with what it opens. */
  extraChips?: readonly StorySignoffExtraChip[]
  /** The evidence card alone, for a page that decides elsewhere. */
  evidenceCardOnly?: boolean
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

/**
 * Native peer of web's `StorySignoffReview`: the decision as the run's "Needs
 * you" card (verdict, the three decisions, only what needs a look, the
 * manager's word and the answers), the run's steps, the story-wide evidence
 * behind chips that are its tabs, "What this is" (the story and each feature
 * with its proof plan, criteria and own evidence on demand), and "More about
 * this run". Until the runs, the story and the evidence have all loaded only
 * its frame is drawn — the features and what is still being read, never a
 * verdict — with the steps and details under it.
 * What approving offers is read alongside the sources, not after them, so the
 * decision has it when the panel draws.
 */
export default function StorySignoffReview(props: StorySignoffReviewProps) {
  const { projectId, storyId, storyRunId } = props
  const evidence = useReviewEvidence(projectId, { storyId })
  const evidenceState = evidenceLoadState(evidence)
  const projectChecks = useProjectChecks(projectId)
  useProcessIntegrationOptions(
    props.workBranch && !props.workBranch.shadow ? storyRunId : undefined,
  )
  const { signoff, status, sources, error } = useStorySignoff(
    projectId,
    storyId,
    storyRunId,
    evidence.refs,
    evidenceState,
    projectChecks,
  )
  if (!signoff) {
    return (
      <View style={{ gap: 14 }}>
        <SignoffFrame
          projectId={projectId}
          storyId={storyId}
          line={
            status === 'failed'
              ? `${SIGNOFF_LOAD_FAILED}${error ? ` — ${error}` : ''}`
              : signoffLoadingLabel(sources)
          }
        />
        {props.steps}
        {props.details}
      </View>
    )
  }
  return (
    <StorySignoffPanel
      {...props}
      signoff={signoff}
      evidence={evidence}
      evidenceState={evidenceState}
      projectChecks={projectChecks.scan}
    />
  )
}

/**
 * What a sign-off shows while it is still being read: the story's features as
 * rows, and which of its sources are on their way — never a verdict.
 */
function SignoffFrame({
  projectId,
  storyId,
  line,
}: {
  projectId: string
  storyId: string
  line: string
}) {
  const { theme } = useNativeTheme()
  const { getStory } = useStories()
  const features = getStory(storyId)?.features ?? []
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{line}</Text>
      {features.map((f) => (
        <View
          key={f.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
          }}
        >
          <DependencyRef dependency={`${storyId}.${f.id}`} projectId={projectId} />
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.secondary }}
          >
            {f.title}
          </Text>
        </View>
      ))}
    </View>
  )
}

type DecisionStep = 'idle' | 'note' | 'integration'

function StorySignoffPanel({
  projectId,
  storyId,
  storyRunId,
  featureSplits,
  choices,
  workBranch,
  integrationModes,
  onChoose,
  error,
  mergeHold,
  onReportText,
  onSaveFile,
  pickLoomVideo,
  onOpenStep,
  proofUnavailable,
  changeUiPaths,
  changeScreensDecision,
  droppedAccepted = [],
  manager,
  onAskManager,
  integration,
  steps,
  details,
  extraChips = [],
  evidenceCardOnly = false,
  signoff,
  evidence,
  evidenceState,
  projectChecks,
}: StorySignoffReviewProps & {
  signoff: StorySignoff
  evidence: UseReviewEvidence
  evidenceState: EvidenceLoadState
  projectChecks: ProjectChecksListing | undefined
}) {
  const loom = useRunWalkthrough(storyRunId)
  const onSetUp = capabilitySetupHandler(useRunChatDraft(), {
    ...(projectChecks ? { projectChecks } : {}),
    inRun: true,
  })
  const { theme, status } = useNativeTheme()
  const { getStory } = useStories()
  const { projects } = useProjects()
  const rendering = useReferenceRendering()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()
  const [step, setStep] = useState<DecisionStep>('idle')
  const [busy, setBusy] = useState(false)
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set())
  const [focusRow, setFocusRow] = useState<string | undefined>()
  const [chipKey, setChipKey] = useState<string | undefined>()
  const [selected, setSelected] = useState<string | undefined>()
  const soleMode = workBranch?.shadow
    ? soleIntegrationMode(workBranch, integrationModes)
    : undefined
  const { options: landingOptions } = useProcessIntegrationOptions(
    workBranch && !workBranch.shadow ? storyRunId : undefined,
  )
  const acceptReport = workBranch
    ? processNothingToMergeSignOff(workBranch, landingOptions?.nothingToMerge, integrationModes)
    : undefined
  const alreadyOnBase =
    workBranch && !acceptReport
      ? processAlreadyOnBaseSignOff(workBranch, landingOptions?.alreadyOnBase, integrationModes)
      : undefined

  const story = getStory(storyId)
  const features = story?.features ?? []
  const proofPreset = requestChangesProofPreset({
    features,
    scope: uiChangeScopeOf(projects.find((p) => p.id === projectId)?.metadata),
    plannedKinds: signoff.features.flatMap((f) => f.proofPlan?.map((r) => r.kind) ?? []),
    ...(proofUnavailable ? { unavailable: proofUnavailable } : {}),
    ...(changeUiPaths ? { uiPaths: changeUiPaths } : {}),
    ...(screensDecisionUiImpact(changeScreensDecision)
      ? { uiImpact: screensDecisionUiImpact(changeScreensDecision) }
      : {}),
  })
  const screensNote = screensDecisionNote(changeScreensDecision)

  const sections = useMemo(
    () => signoffSections(signoff, evidence.tiles),
    [signoff, evidence.tiles],
  )
  const verifyBySection = useMemo(
    () => signoffVerifyViews(signoff, evidence.tiles, evidenceState),
    [signoff, evidence.tiles, evidenceState],
  )
  const sectionOf = (id: string): SignoffSection => sections.get(id) ?? EMPTY_SIGNOFF_SECTION
  const overallSection = sectionOf('')
  const storyReview = overallSection.codeReviews[0]
  const storyReviewVerdict = signoff.overall?.codeReview
  const storyReviewView = useMemo(
    () => (storyReview ? codeReviewView(storyReview, storyReviewVerdict) : undefined),
    [storyReview, storyReviewVerdict],
  )
  const finalReport = overallSection.reports[0]

  useEffect(() => {
    onReportText?.(finalReport?.text)
  }, [finalReport?.text, onReportText])

  const runBacked = new Set(signoff.features.map((f) => f.featureId))
  const evidenceOnly = [...features]
    .reverse()
    .filter((f) => !runBacked.has(f.id) && sections.has(f.id))
  const featureOf = (id: string) => features.find((f) => f.id === id)

  const pairGroups = useMemo(() => {
    const groups: ScreenPair[][] = []
    for (const [id, section] of sections) {
      if (id !== '' && !verifyBySection.has(id)) groups.push(section.pairs)
    }
    for (const v of verifyBySection.values()) groups.push(v.accepted.evidence.pairs)
    return groups
  }, [sections, verifyBySection])
  const overlayPairs = useMemo(
    () => overlayPairsFor(pairGroups, openPairKey),
    [pairGroups, openPairKey],
  )

  const hasSignoff =
    signoff.features.length > 0 || signoff.fixes.length > 0 || signoff.overall !== undefined
  const noEvidenceFiled = !hasSignoff && evidence.tiles.length === 0 && extraChips.length === 0

  const ownReviewOf = (featureId: string) => {
    const own = sectionOf(featureId).codeReviews[0]
    return own ? codeReviewView(own) : undefined
  }
  const criteriaOf = (featureId: string) =>
    ownReviewOf(featureId)?.criteriaMet ??
    (features.length === 1 ? storyReviewView?.criteriaMet : undefined)
  const judgementOf = (
    featureId: string,
    acceptance: string | undefined,
  ): AcceptanceJudgement | undefined => {
    const review = ownReviewOf(featureId) ?? storyReviewView
    const lines = acceptanceCriteriaLines(acceptance)
    return review && lines.length > 0 ? judgeAcceptance(lines, review.criteria) : undefined
  }
  const save = onSaveFile ? { onSaveFile } : {}

  const rows: { view: SignoffFeatureRowView; detail: () => ReactNode }[] = [
    ...signoff.fixes.map((f) => ({
      view: signoffFeatureRow({
        key: f.sectionId,
        dependency: undefined,
        label: f.label,
        title: f.title,
        proofPlan: f.proofPlan,
        acceptance: undefined,
        judgement: undefined,
        criteriaMet: undefined,
        status: f.statusLine,
        facts: f.facts,
      }),
      detail: () => (
        <FeatureReviewSection
          projectId={projectId}
          kind="embedded"
          title={f.title}
          facts={f.facts}
          agents={f.agents}
          rows={f.rows}
          verification={f.verification}
          statusLine={f.statusLine}
          {...(f.developerChecks ? { developerChecks: f.developerChecks } : {})}
          {...signoffFixSectionProps(sectionOf(f.sectionId), verifyBySection.get(f.sectionId), f)}
          onOpenPair={setOpenPairKey}
          onRequestImage={evidence.requestImage}
          {...(onSetUp ? { onSetUp } : {})}
          {...save}
        />
      ),
    })),
    ...signoff.features.map((f) => ({
      view: signoffFeatureRow({
        key: f.featureId,
        dependency: `${storyId}.${f.featureId}`,
        label: f.title,
        title: f.title,
        proofPlan: f.proofPlan,
        acceptance: featureOf(f.featureId)?.acceptance,
        judgement: judgementOf(f.featureId, featureOf(f.featureId)?.acceptance),
        criteriaMet: criteriaOf(f.featureId),
        status: f.statusLine,
        facts: f.facts,
      }),
      detail: () => (
        <FeatureReviewSection
          projectId={projectId}
          kind="embedded"
          title={f.title}
          facts={f.facts}
          agents={f.agents}
          rows={f.rows}
          verification={f.verification}
          statusLine={f.statusLine}
          {...(f.developerChecks ? { developerChecks: f.developerChecks } : {})}
          {...signoffSectionProps(
            sectionOf(f.featureId),
            verifyBySection.get(f.featureId),
            f.codeReview,
          )}
          onOpenPair={setOpenPairKey}
          onRequestImage={evidence.requestImage}
          {...(onSetUp ? { onSetUp } : {})}
          {...save}
        />
      ),
    })),
    ...evidenceOnly.map((f) => ({
      view: signoffFeatureRow({
        key: f.id,
        dependency: `${storyId}.${f.id}`,
        label: f.title,
        title: f.title,
        proofPlan: undefined,
        acceptance: f.acceptance,
        judgement: undefined,
        criteriaMet: undefined,
        status: { tone: 'review' as const, label: 'Not verified' },
        facts: { costLabel: undefined, durationLabel: undefined },
      }),
      detail: () => (
        <FeatureReviewSection
          projectId={projectId}
          kind="embedded"
          title={f.title}
          facts={{ costLabel: undefined, durationLabel: undefined }}
          agents={[]}
          rows={[]}
          verification={undefined}
          statusLine={{ tone: 'review', label: 'Not verified' }}
          {...signoffSectionProps(sectionOf(f.id), undefined)}
          onOpenPair={setOpenPairKey}
          onRequestImage={evidence.requestImage}
          {...(onSetUp ? { onSetUp } : {})}
          {...save}
        />
      ),
    })),
  ]
  const proofPlanOf = (key: string) =>
    signoff.features.find((f) => f.featureId === key)?.proofPlan ??
    signoff.fixes.find((f) => f.sectionId === key)?.proofPlan

  const attention = signoffAttentionItems(
    [
      ...signoff.fixes.map((f) => ({ id: f.sectionId, dependency: undefined, label: f.label })),
      ...signoff.features.map((f) => ({
        id: f.featureId,
        dependency: `${storyId}.${f.featureId}`,
        label: f.title,
      })),
    ].flatMap((s) => {
      const v = verifyBySection.get(s.id)
      return v ? [{ ...s, mode: v.mode, standing: v.standing, acceptedBy: v.acceptedBy }] : []
    }),
  )

  const toggleRow = (key: string) =>
    setOpenRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const showSection = (key: string) => {
    setOpenRows((prev) => new Set(prev).add(key))
    setFocusRow(key)
  }

  const newestFix = signoff.fixes[0]
  const newestFixVerify = newestFix ? verifyBySection.get(newestFix.sectionId) : undefined
  const request = newestFix
    ? signoffRequestOutcome(
        newestFix,
        newestFixVerify
          ? { standing: newestFixVerify.standing, pairs: newestFixVerify.accepted.evidence.pairs }
          : undefined,
      )
    : undefined
  const requestPairs = request?.pairs ?? []
  const decisionItems = signoffDecisionItems({
    request,
    fix: newestFix
      ? {
          label: newestFix.label,
          sectionId: newestFix.sectionId,
          step: newestFix.verify
            ? {
                runId: newestFix.processRunId,
                stepId: newestFix.verify.entry.stepId,
                entryId: newestFix.verify.entry.id,
              }
            : undefined,
        }
      : undefined,
    attention,
    droppedAccepted,
  })

  const overall = signoff.overall
  const { tests: testChecks, build: buildChecks } = reviewCheckGroups(overall?.verification)
  const testTotals = aggregateTestCounts(testChecks)
  const proofRecordings = signoffProofRecordings(sections)
  const overallRows = signoffRowsWithRecordings(overall?.rows ?? [], proofRecordings.length)
  const tabs = reviewTabs({
    screens: overall ? requestPairs.length : 0,
    walkthroughs: overall ? proofRecordings.length : 0,
    reports: overall ? overallSection.reports.length : 0,
    testCount: testTotals?.total ?? 0,
    testChecks: ranReviewChecks(testChecks).length,
    buildChecks: ranReviewChecks(buildChecks).length,
    changedFiles: undefined,
    codeReviews: overall ? overallSection.codeReviews.length : 0,
    ...(overallSection.leadTab ? { lead: overallSection.leadTab } : {}),
    ...(loom.view ? { loom: { total: loom.view.rows.length, left: loom.view.left } } : {}),
  })
  const tabOrder = reviewTabOrder(overallSection.leadTab ?? 'report')
  const chips = signoffEvidenceChips(overallRows, tabs, tabOrder)
  const extraChip = extraChips.find((c) => c.key === chipKey)
  const current = extraChip
    ? undefined
    : (chips.find((c) => c.key === chipKey) ?? chips.find((c) => c.target.kind === 'tab'))
  const missingRow =
    current?.target.kind === 'missing'
      ? overall?.rows.find((r) => r.id === current.row.id)
      : undefined
  const missingSetUp =
    onSetUp && missingRow && capabilitySetupOffered(missingRow)
      ? () => onSetUp(missingRow)
      : undefined
  const openTab = (tab: ReviewTabId) => {
    const chip = evidenceChipForTab(chips, tab)
    if (chip) setChipKey(chip.key)
  }
  const needsYouFocus = useRunNeedsYou()?.focus
  const reportChipKey = evidenceChipForTab(chips, 'report')?.key
  useEffect(() => {
    if (needsYouFocus && reportChipKey) setChipKey(reportChipKey)
  }, [needsYouFocus, reportChipKey])

  if (noEvidenceFiled) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        No evidence was filed for this story’s features.
      </Text>
    )
  }

  const criteriaCount = features.reduce(
    (n, f) => n + acceptanceCriteriaLines(f.acceptance).length,
    0,
  )
  const acceptance = sumAcceptanceJudgements(
    features.map(
      (f) =>
        judgementOf(f.id, f.acceptance) ?? {
          asked: acceptanceCriteriaLines(f.acceptance).length,
          judged: 0,
          met: 0,
        },
    ),
  )
  const proof = signoffProofRows({
    checks: overallRows,
    testTotals,
    codeReview: overall?.steps.find((l) => l.key === 'code-review'),
    walkthrough:
      overall?.steps.find((l) => l.key === 'walkthrough') ??
      signoffRecordingsProofLine(proofRecordings.length),
    verify: [
      ...(newestFix && newestFixVerify
        ? [{ label: newestFix.label, status: newestFix.statusLine }]
        : []),
      ...signoff.features
        .filter((f) => verifyBySection.has(f.featureId))
        .map((f) => ({ label: f.title, status: f.statusLine })),
    ],
    tabs: tabs.map((t) => t.id),
  })
  const reportView = signoffReportView({
    report: finalReport,
    featureCount: features.length || signoff.features.length,
    criteriaCount,
    criteriaMet: storyReviewView?.criteriaMet,
    acceptance,
    proof,
    featuresDelivered: signoffFeaturesDelivered(signoff.digest),
    took: { duration: signoff.facts.durationLabel, cost: signoff.facts.costLabel },
    ...(signoff.work ? { work: signoff.work } : {}),
    ...(signoff.accessRecords ? { accessRecords: signoff.accessRecords } : {}),
    projectNames: accessRecordProjectNames(projects),
    tabs: tabs.map((t) => t.id),
  })

  const decide = (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => {
    if (!onChoose) return
    setBusy(true)
    void onChoose(choice, note, integration, requestedProof)
      .then((ok) => {
        if (ok) setStep('idle')
      })
      .finally(() => setBusy(false))
  }

  const offered = (choices ?? [])
    .filter(isResumeParkChoice)
    .filter((c) => !(mergeHold && c.choice === 'approve'))
    .map((c) =>
      c.choice === 'approve'
        ? {
            ...c,
            label:
              acceptReport?.approveLabel ?? alreadyOnBase?.approveLabel ?? SIGNOFF_APPROVE_LABEL,
            ...(acceptReport ? { detail: acceptReport.approveDoes } : {}),
          }
        : c,
    )
  const canDecide = offered.length > 0 && onChoose !== undefined
  const headline = signoff.headline?.title ?? signoff.verdict.title
  const answers = processParkAnswersView(offered, manager, selected)
  const send = (answer: ParkAnswerView, note: string | undefined) => {
    if (answer.choice === 'approve' && workBranch) {
      const settled = acceptReport?.decision ?? alreadyOnBase?.decision
      if (settled) return decide('approve', note, settled)
      if (soleMode) return decide('approve', note, { mode: soleMode })
      return setStep('integration')
    }
    if (answer.choice === 'request-changes') {
      return note ? decide('request-changes', note, undefined, proofPreset) : setStep('note')
    }
    if (!note && choiceTakesNote(answer.choice)) return setStep('note')
    decide(answer.choice as ProcessResumeChoice, note)
  }
  const card = {
    gap: 12,
    padding: 14,
    borderRadius: nativeRadii[3],
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: theme.surface.raised,
  } as const
  const caps = {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.text.muted,
  } as const
  const openStory = () => rendering?.onOpen?.({ kind: 'story', projectId, storyId })

  const evidenceCard =
    chips.length > 0 || extraChips.length > 0 ? (
      <View accessibilityLabel={SIGNOFF_SECTION_TITLES.evidence} style={card}>
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        >
          {chips.map((chip) => (
            <CheckChip
              key={chip.key}
              row={chip.row}
              selected={!extraChip && isEvidenceChipSelected(chip, chipKey, chips)}
              onPress={() => setChipKey(chip.key)}
            />
          ))}
          {extraChips.map((chip) => (
            <CheckChip
              key={chip.key}
              row={chip.row}
              selected={chip === extraChip}
              onPress={() => setChipKey(chip.key)}
            />
          ))}
        </View>
        {extraChip ? (
          extraChip.content
        ) : current?.target.kind === 'missing' ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
              {current.target.title}
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{current.target.text}</Text>
            {missingSetUp ? (
              <View style={{ alignItems: 'flex-start' }}>
                <SetUpWithAgentButton onPress={missingSetUp} />
              </View>
            ) : null}
          </View>
        ) : current?.target.tab === 'report' ? (
          <SignoffReportPanel view={reportView} onOpenTab={openTab} />
        ) : current?.target.tab === 'screens' ? (
          <ScreensTab
            pairs={requestPairs}
            onOpen={setOpenPairKey}
            capturedLabel={undefined}
            onRequestImage={evidence.requestImage}
          />
        ) : current?.target.tab === 'tests' ? (
          <View style={{ gap: 8 }}>
            <ChecksTab
              methods={overallRows.filter((r) => TEST_METHODS.includes(r.id))}
              checks={testChecks}
              branch={undefined}
              busyId={undefined}
            />
            {projectChecks?.knownFlakes ? (
              <ProjectFlakesList flakes={projectChecks.knownFlakes} />
            ) : null}
          </View>
        ) : current?.target.tab === 'build' ? (
          <ChecksTab
            methods={overallRows.filter((r) => BUILD_METHODS.includes(r.id))}
            checks={buildChecks}
            branch={undefined}
            busyId={undefined}
          />
        ) : current?.target.tab === 'code-review' && storyReview ? (
          <CodeReviewPanel
            review={storyReview}
            {...(storyReviewVerdict ? { verdict: storyReviewVerdict } : {})}
            {...save}
          />
        ) : current?.target.tab === 'walkthrough' ? (
          <WalkthroughTab projectId={projectId} recordings={proofRecordings} {...save} />
        ) : current?.target.tab === 'loom' && loom.view ? (
          <LoomWalkthroughPanel
            view={loom.view}
            attachLink={loom.attachLink}
            attachFile={loom.attachFile}
            {...(pickLoomVideo ? { pickVideo: pickLoomVideo } : {})}
          />
        ) : null}
      </View>
    ) : null

  const overlay = (
    <ComparisonOverlay
      pairs={overlayPairs}
      openKey={openPairKey}
      onClose={() => setOpenPairKey(undefined)}
      baseSha={undefined}
      headSha={undefined}
      onRequestImage={evidence.requestImage}
      {...save}
      projectId={projectId}
    />
  )

  if (evidenceCardOnly) {
    return (
      <>
        {evidenceCard}
        {overlay}
      </>
    )
  }

  return (
    <View style={{ gap: 14 }}>
      <RunNeedsYouCard
        style={{ marginHorizontal: 0, marginTop: 0 }}
        tone="review"
        where={<VerdictBadge verdict={signoff.verdict} tally={signoff.digest.tally} />}
        {...(onAskManager ? { onAskManager } : {})}
      >
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
            {headline}
          </Text>
          {signoff.headline?.detail ? (
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {signoff.headline.detail}
            </Text>
          ) : null}
          {signoff.outsideScope ? (
            <Text style={{ fontSize: 12.5, color: status.review.softFg }}>
              {signoff.outsideScope}
            </Text>
          ) : null}
          <SignoffDecisionList
            projectId={projectId}
            items={decisionItems}
            onOpenPair={setOpenPairKey}
            {...(onOpenStep ? { onOpenStep } : {})}
            onShowSection={showSection}
            onRequestImage={evidence.requestImage}
          />
          {canDecide ? <RunTicketPostNote runId={storyRunId} /> : null}
        </View>

        {integration}

        {(acceptReport ?? alreadyOnBase) ? (
          <View
            accessibilityRole="summary"
            style={{
              padding: 12,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: status.done.softBorder,
              backgroundColor: status.done.softBg,
            }}
          >
            <Text style={{ fontSize: 13, color: theme.text.primary }}>
              {(acceptReport ?? alreadyOnBase)?.notice}
            </Text>
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
            proofPreset={proofPreset}
            onSend={(note, requestedProof) =>
              decide('request-changes', note, undefined, requestedProof)
            }
            onCancel={() => setStep('idle')}
          />
        ) : null}

        {canDecide && step === 'integration' && workBranch ? (
          <IntegrationChooser
            runId={storyRunId}
            workBranch={workBranch}
            {...(integrationModes ? { modes: integrationModes } : {})}
            busy={busy}
            onChoose={(decision) => decide('approve', undefined, decision)}
            onCancel={() => setStep('idle')}
          />
        ) : null}

        {mergeHold ? (
          <View
            accessibilityRole="summary"
            style={{
              gap: 8,
              padding: 12,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: status.review.softBorder,
              backgroundColor: status.review.softBg,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
              {mergeHold.reason}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {mergeHold.waitingOn.map((leg) => (
                <View
                  key={leg.key}
                  style={{
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: status[leg.tone].softBorder,
                    backgroundColor: status[leg.tone].softBg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11.5, color: status[leg.tone].softFg }}>
                    {leg.name} · {leg.status}
                  </Text>
                </View>
              ))}
            </View>
            {mergeHold.onOpenGroup ? (
              <Button
                size="sm"
                variant="secondary"
                accessibilityLabel={mergeHold.openLabel ?? 'Open the group run'}
                onPress={mergeHold.onOpenGroup}
              >
                {mergeHold.openLabel ?? 'Group'}
              </Button>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              padding: 10,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: status.stuck.softBorder,
              backgroundColor: status.stuck.softBg,
            }}
          >
            <Text style={{ fontSize: 12.5, color: status.stuck.softFg }}>{error}</Text>
          </View>
        ) : null}
      </RunNeedsYouCard>

      {steps}

      {evidenceCard}

      <View accessibilityLabel={SIGNOFF_SECTION_TITLES.what} style={card}>
        <StorySpecCard
          projectId={projectId}
          storyId={storyId}
          title={story?.title ?? 'Story'}
          description={story?.description}
          features={features}
          featureSplits={featureSplits}
          onOpenStory={openStory}
        />

        {rows.map(({ view, detail }) => {
          const open = openRows.has(view.key)
          const proofPlan = proofPlanOf(view.key)
          return (
            <View
              key={view.key}
              style={{
                gap: 8,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: theme.border.subtle,
                ...(focusRow === view.key
                  ? {
                      borderWidth: 2,
                      borderColor: status.working.softBorder,
                      borderRadius: nativeRadii[2],
                      padding: 8,
                    }
                  : {}),
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => toggleRow(view.key)}
                style={{ gap: 6 }}
              >
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
                >
                  {view.dependency ? (
                    <DependencyRef dependency={view.dependency} projectId={projectId} />
                  ) : (
                    <IdChip kind="story">{view.label}</IdChip>
                  )}
                  <Text
                    style={{
                      flex: 1,
                      minWidth: 120,
                      fontSize: 13.5,
                      fontWeight: '600',
                      color: theme.text.primary,
                    }}
                  >
                    {view.title}
                  </Text>
                  <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                    <IconChevronRight size={14} color={theme.text.secondary} />
                  </View>
                </View>
                {request?.sectionId === view.key && request.pairs.length > 0 ? (
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
                  >
                    {request.pairs.map((pair) => (
                      <Pressable
                        key={pair.key}
                        accessibilityRole="button"
                        onPress={() => setOpenPairKey(pair.key)}
                      >
                        <Pill tone="done" label={`Before/after · ${pair.title}`} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {view.proofChips.length > 0 || view.criteriaLine ? (
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
                  >
                    {view.proofChips.map((chip) => (
                      <Pill key={chip.key} tone={chip.tone} label={`${chip.label} ${chip.mark}`} />
                    ))}
                    {view.criteriaLine ? (
                      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                        {view.criteriaLine}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
                >
                  <Pill
                    tone={
                      view.status.tone === 'done'
                        ? 'done'
                        : view.status.tone === 'stuck'
                          ? 'stuck'
                          : 'review'
                    }
                    label={view.status.label}
                  />
                  <DurCostChips facts={view.facts} />
                </View>
              </Pressable>
              {open ? (
                <View style={{ gap: 12, paddingBottom: 6 }}>
                  {view.criteria.length > 0 ? (
                    <View style={{ gap: 4 }}>
                      <Text style={caps}>{SIGNOFF_SECTION_TITLES.criteria}</Text>
                      {view.criteria.map((c) => (
                        <Text key={c} style={{ fontSize: 12.5, color: theme.text.primary }}>
                          • {c}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {proofPlan && proofPlan.length > 0 ? <ProofPlanMarks rows={proofPlan} /> : null}
                  {detail()}
                </View>
              ) : null}
            </View>
          )
        })}
      </View>

      {screensNote ? <ScreensDecisionNote note={screensNote} /> : null}

      {details}

      {overlay}
    </View>
  )
}
