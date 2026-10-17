import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import {
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
  ranReviewChecks,
  requestChangesProofPreset,
  requestProofChoices,
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
  signoffProofRows,
  signoffReportView,
  signoffRequestOutcome,
  signoffSectionProps,
  signoffSections,
  signoffVerifyViews,
  soleIntegrationMode,
  sumAcceptanceJudgements,
  EMPTY_SIGNOFF_SECTION,
  SIGNOFF_APPROVE_LABEL,
  SIGNOFF_CANCEL_LABEL,
  SIGNOFF_DECISION_LABEL,
  SIGNOFF_LOAD_FAILED,
  SIGNOFF_REJECT_CONFIRM,
  SIGNOFF_REJECT_CONFIRM_LABEL,
  SIGNOFF_SECTION_TITLES,
  uiChangeScopeOf,
  useProjects,
  useProcessIntegrationOptions,
  useProjectChecks,
  useReviewEvidence,
  useRunChatDraft,
  useStories,
  useStorySignoff,
  type AcceptanceJudgement,
  type CheckMethodId,
  type EvidenceLoadState,
  type ProcessIntegrationDecision,
  type ProcessIntegrationMode,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type SignoffMergeHold,
  type ProcessWorkBranch,
  type ProofKind,
  type ProofKindUnavailable,
  type ReviewTabId,
  type ScreenPair,
  type SignoffFeatureRowView,
  type SignoffSection,
  type SignoffStepTarget,
  type StorySignoff,
  type UseReviewEvidence,
} from '../../../headless'
import type { ProjectChecksListing } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { IconChevronRight, IconGroup } from '../../icons'
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
} from '../chat/signoff'
import DependencyBullet from '../stories/DependencyBullet'
import FeatureReviewSection from './FeatureReviewSection'
import IntegrationChooser from './IntegrationChooser'
import ParkNoteComposer from './ParkNoteComposer'
import ProofPlanMarks from './ProofPlanMarks'
import CodeReviewPanel from './signoff/CodeReviewPanel'
import ProcessCleanupCard from './signoff/ProcessCleanupCard'
import SignoffDecisionList from './signoff/SignoffDecisionList'
import SignoffReportPanel from './signoff/SignoffReportPanel'
import StorySpecCard from './signoff/StorySpecCard'
import { PROCESS_TONE_BADGE, REVIEW_TONE_BADGE } from './signoff/tones'

/** A group leg that cannot merge yet, and the way to its group run. */
export type StorySignoffMergeHold = SignoffMergeHold & { onOpenGroup?: () => void }

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** The story run being signed off — each feature shows where its run under it stands. */
  storyRunId: string
  /** The gate's decision choices — the decision bar acts on the whole story. */
  choices?: readonly ProcessParkChoice[]
  /** Set when approving must say how the work comes in — the run's work branch. */
  workBranch?: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>
  /** The only ways approving may bring the work in, when they are narrowed (`processRunIntegrationModes`). */
  integrationModes?: readonly ProcessIntegrationMode[]
  /**
   * Answer the gate. Resolves `false` when the server refused — the reason is
   * then in `error`, and the decision stays open to try again.
   */
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
  /** Open a step's output in the pipeline's side panel — the fix pass chip's target. */
  onOpenStep?: (target: SignoffStepTarget) => void
  /** What proof the run cannot produce here: never preset for a request for changes, and never choosable. */
  proofUnavailable?: readonly ProofKindUnavailable[]
  /** The files of the story's change that alter what users see; empty, and screens are never preset. */
  changeUiPaths?: readonly string[]
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

/**
 * The story sign-off, top to bottom: the decision (verdict, the three
 * decisions, and only what needs a look first), "What this is" (the story and
 * each feature with its proof plan, criteria and own evidence on demand), and
 * the story-wide evidence behind chips that are its tabs — checked first,
 * missing last.
 *
 * Until the runs, the story and the evidence have all loaded only its frame is
 * drawn — the features and what is still being read: a verdict computed from
 * part of them is wrong, and it flips once the rest arrives.
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
      <SignoffFrame
        storyId={storyId}
        line={
          status === 'failed'
            ? `${SIGNOFF_LOAD_FAILED}${error ? ` — ${error}` : ''}`
            : signoffLoadingLabel(sources)
        }
      />
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
function SignoffFrame({ storyId, line }: { storyId: string; line: string }) {
  const { getStory } = useStories()
  const features = getStory(storyId)?.features ?? []
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-(--text-secondary)">{line}</div>
      {features.length > 0 ? (
        <div className="flex flex-col">
          {features.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 border-b border-(--border-subtle) py-2.5 last:border-b-0"
            >
              <DependencyBullet dependency={`${storyId}.${f.id}`} interactive />
              <span className="min-w-0 truncate text-[13.5px] font-semibold text-(--text-secondary)">
                {f.title}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type DecisionStep = 'idle' | 'note' | 'integration' | 'reject'

function StorySignoffPanel({
  projectId,
  storyId,
  storyRunId,
  choices,
  workBranch,
  integrationModes,
  onChoose,
  error,
  mergeHold,
  onReportText,
  onOpenStep,
  proofUnavailable,
  changeUiPaths,
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
  const onSetUp = capabilitySetupHandler(useRunChatDraft(), {
    ...(projectChecks ? { projectChecks } : {}),
    inRun: true,
  })
  const { getStory } = useStories()
  const { projects } = useProjects()
  const navigate = useNavigate()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()
  const [step, setStep] = useState<DecisionStep>('idle')
  const [busy, setBusy] = useState(false)
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set())
  const [focusRow, setFocusRow] = useState<string | undefined>()
  const [chipKey, setChipKey] = useState<string | undefined>()
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const soleMode = workBranch?.shadow
    ? soleIntegrationMode(workBranch, integrationModes)
    : undefined
  const { options: landingOptions } = useProcessIntegrationOptions(
    workBranch && !workBranch.shadow ? storyRunId : undefined,
  )
  const alreadyOnBase = workBranch
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
  })

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
  if (!hasSignoff && evidence.tiles.length === 0) {
    return (
      <div className="text-[12px] text-(--text-secondary)">
        No evidence was filed for this story’s features.
      </div>
    )
  }

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
      return v ? [{ ...s, mode: v.mode, standing: v.standing }] : []
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
    requestAnimationFrame(() =>
      rowRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
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
  })

  const overall = signoff.overall
  const { tests: testChecks, build: buildChecks } = reviewCheckGroups(overall?.verification)
  const testTotals = aggregateTestCounts(testChecks)
  const tabs = overall
    ? reviewTabs({
        screens: requestPairs.length,
        walkthroughs: overallSection.recordings.length,
        reports: overallSection.reports.length,
        testCount: testTotals?.total ?? 0,
        testChecks: ranReviewChecks(testChecks).length,
        buildChecks: ranReviewChecks(buildChecks).length,
        changedFiles: undefined,
        codeReviews: overallSection.codeReviews.length,
        ...(overallSection.leadTab ? { lead: overallSection.leadTab } : {}),
      })
    : []
  const tabOrder = reviewTabOrder(overallSection.leadTab ?? 'report')
  const chips = overall ? signoffEvidenceChips(overall.rows, tabs, tabOrder) : []
  const current = chips.find((c) => c.key === chipKey) ?? chips.find((c) => c.target.kind === 'tab')
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
    checks: overall?.rows ?? [],
    testTotals,
    codeReview: overall?.steps.find((l) => l.key === 'code-review'),
    walkthrough: overall?.steps.find((l) => l.key === 'walkthrough'),
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
  const canDecide = offered.length > 0 && onChoose !== undefined
  const headline = signoff.headline?.title ?? signoff.verdict.title

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Decision"
        className="flex flex-wrap items-center gap-4 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4"
      >
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <VerdictBadge verdict={signoff.verdict} tally={signoff.digest.tally} />
            <span className="text-[12px] text-(--text-secondary)">{SIGNOFF_DECISION_LABEL}</span>
          </div>
          <div className="text-[17px] font-semibold leading-snug text-(--text-primary)">
            {headline}
          </div>
          {signoff.headline?.detail ? (
            <div className="max-w-[72ch] text-[12.5px] text-(--text-secondary)">
              {signoff.headline.detail}
            </div>
          ) : null}
          <SignoffDecisionList
            items={decisionItems}
            onOpenPair={setOpenPairKey}
            {...(onOpenStep ? { onOpenStep } : {})}
            onShowSection={showSection}
            onRequestImage={evidence.requestImage}
          />
        </div>

        {alreadyOnBase ? (
          <div
            role="note"
            className="flex-[1_1_100%] rounded-lg border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-3 py-2.5 text-[13px] text-(--text-primary)"
          >
            {alreadyOnBase.notice}
          </div>
        ) : null}

        {canDecide && step === 'idle' ? (
          <div className="flex flex-wrap items-center gap-2">
            {offered.map((c) => (
              <Button
                key={c.choice}
                size="md"
                variant={c.primary ? 'primary' : c.choice === 'reject' ? 'ghost' : 'secondary'}
                className={c.choice === 'reject' ? 'text-(--status-stuck-soft-fg)' : undefined}
                title={c.detail}
                disabled={busy}
                onClick={() =>
                  c.choice === 'approve' && workBranch
                    ? alreadyOnBase
                      ? decide('approve', undefined, alreadyOnBase.decision)
                      : soleMode
                        ? decide('approve', undefined, { mode: soleMode })
                        : setStep('integration')
                    : c.choice === 'reject'
                      ? setStep('reject')
                      : choiceTakesNote(c.choice)
                        ? setStep('note')
                        : decide(c.choice)
                }
              >
                {c.choice === 'approve'
                  ? (alreadyOnBase?.approveLabel ?? SIGNOFF_APPROVE_LABEL)
                  : c.label}
              </Button>
            ))}
          </div>
        ) : null}

        {canDecide && step === 'note' ? (
          <div className="flex-[1_1_100%]">
            <ParkNoteComposer
              proofChoices={requestProofChoices(proofUnavailable)}
              proofPreset={proofPreset}
              onSend={(note, requestedProof) =>
                decide('request-changes', note, undefined, requestedProof)
              }
              onCancel={() => setStep('idle')}
            />
          </div>
        ) : null}

        {canDecide && step === 'integration' && workBranch ? (
          <div className="flex-[1_1_100%] rounded-lg border border-(--status-review-soft-border) bg-(--status-review-soft-bg) p-3">
            <IntegrationChooser
              runId={storyRunId}
              workBranch={workBranch}
              {...(integrationModes ? { modes: integrationModes } : {})}
              busy={busy}
              onChoose={(decision) => decide('approve', undefined, decision)}
              onCancel={() => setStep('idle')}
            />
          </div>
        ) : null}

        {canDecide && step === 'reject' ? (
          <div className="flex flex-[1_1_100%] flex-wrap items-center gap-2.5 rounded-lg border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) p-3 text-(--status-stuck-soft-fg)">
            <span className="flex-[1_1_300px] text-[13px]">{SIGNOFF_REJECT_CONFIRM}</span>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStep('idle')}>
              {SIGNOFF_CANCEL_LABEL}
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => decide('reject')}>
              {SIGNOFF_REJECT_CONFIRM_LABEL}
            </Button>
          </div>
        ) : null}

        {mergeHold ? (
          <div
            role="note"
            className="flex flex-[1_1_100%] flex-wrap items-center gap-2 rounded-lg border border-(--status-review-soft-border) bg-(--status-review-soft-bg) px-3 py-2.5 text-[13px] text-(--text-primary)"
          >
            <span className="font-medium">{mergeHold.reason}</span>
            {mergeHold.waitingOn.map((leg) => (
              <span
                key={leg.key}
                className={`badge badge--soft badge--sm ${PROCESS_TONE_BADGE[leg.tone]}`}
              >
                {leg.name} · {leg.status}
              </span>
            ))}
            {mergeHold.onOpenGroup ? (
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto gap-1.5"
                onClick={mergeHold.onOpenGroup}
                aria-label="Open the group run"
              >
                <IconGroup className="size-4" />
                Group
              </Button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex-[1_1_100%] rounded-lg border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-3 py-2 text-[12.5px] text-(--status-stuck-soft-fg)"
          >
            {error}
          </div>
        ) : null}
      </section>

      <ProcessCleanupCard runId={storyRunId} />

      <section
        aria-label={SIGNOFF_SECTION_TITLES.what}
        className="rounded-xl border border-(--border-subtle) bg-(--surface-raised)"
      >
        <div className="border-b border-(--border-subtle) px-5 py-4">
          <StorySpecCard
            storyId={storyId}
            title={story?.title ?? 'Story'}
            description={story?.description}
            features={features}
            onOpenStory={() => navigate(`/projects/${projectId}/stories/${storyId}`)}
          />
        </div>

        <div className="flex flex-col px-5 pb-2 pt-1">
          {rows.map(({ view, detail }) => {
            const open = openRows.has(view.key)
            const proofPlan = proofPlanOf(view.key)
            return (
              <div
                key={view.key}
                ref={(el) => {
                  if (el) rowRefs.current.set(view.key, el)
                  else rowRefs.current.delete(view.key)
                }}
                className={`border-b border-(--border-subtle) last:border-b-0 ${focusRow === view.key ? 'rounded-md outline-2 outline-(--status-working-soft-border)' : ''}`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {view.dependency ? (
                        <DependencyBullet dependency={view.dependency} interactive />
                      ) : (
                        <IdChip kind="story">{view.label}</IdChip>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleRow(view.key)}
                        className="min-w-0 text-left text-[13.5px] font-semibold text-(--text-primary)"
                      >
                        {view.title}
                      </button>
                    </div>
                    {request?.sectionId === view.key && request.pairs.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        {request.pairs.map((pair) => (
                          <button
                            key={pair.key}
                            type="button"
                            onClick={() => setOpenPairKey(pair.key)}
                            className="badge badge--soft badge--sm badge--done hover:opacity-80"
                          >
                            Before/after · {pair.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {view.proofChips.length > 0 || view.criteriaLine ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        {view.proofChips.length > 0 ? (
                          <span className="text-(--text-secondary)">Proof plan</span>
                        ) : null}
                        {view.proofChips.map((chip) => (
                          <span
                            key={chip.key}
                            title={chip.detail}
                            className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[chip.tone]}`}
                          >
                            {chip.label} {chip.mark}
                          </span>
                        ))}
                        {view.criteriaLine ? (
                          <span className="text-(--text-secondary)">
                            {view.proofChips.length > 0 ? '· ' : ''}
                            {view.criteriaLine}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge badge--soft badge--sm ${view.status.tone === 'done' ? 'badge--done' : view.status.tone === 'stuck' ? 'badge--stuck' : 'badge--review'}`}
                    >
                      {view.status.label}
                    </span>
                    <DurCostChips facts={view.facts} />
                    <button
                      type="button"
                      aria-label={open ? 'Hide the spec and proof' : 'Show the spec and proof'}
                      aria-expanded={open}
                      onClick={() => toggleRow(view.key)}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
                    >
                      <IconChevronRight
                        className={`size-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
                      />
                    </button>
                  </div>
                </div>
                {open ? (
                  <div className="flex flex-col gap-3 pb-4">
                    {view.criteria.length > 0 || (proofPlan && proofPlan.length > 0) ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {view.criteria.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                              {SIGNOFF_SECTION_TITLES.criteria}
                            </span>
                            <ul className="m-0 flex list-disc flex-col gap-1 pl-4 text-[12.5px] text-(--text-primary)">
                              {view.criteria.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {proofPlan && proofPlan.length > 0 ? (
                          <ProofPlanMarks rows={proofPlan} />
                        ) : null}
                      </div>
                    ) : null}
                    {detail()}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {overall && chips.length > 0 ? (
        <section
          aria-label={SIGNOFF_SECTION_TITLES.evidence}
          className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)"
        >
          <div
            role="tablist"
            className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-5 py-3.5"
          >
            {chips.map((chip) => (
              <CheckChip
                key={chip.key}
                row={chip.row}
                role="tab"
                selected={isEvidenceChipSelected(chip, chipKey, chips)}
                onClick={() => setChipKey(chip.key)}
              />
            ))}
          </div>
          <div className="flex flex-col px-5 pb-5 pt-2">
            {current?.target.kind === 'missing' ? (
              <div className="flex max-w-[70ch] flex-col items-start gap-2.5 pt-3">
                <span className="text-[13.5px] font-semibold text-(--text-primary)">
                  {current.target.title}
                </span>
                <span className="text-[13px] text-(--text-secondary)">{current.target.text}</span>
                {missingSetUp ? <SetUpWithAgentButton onClick={missingSetUp} /> : null}
              </div>
            ) : current?.target.tab === 'report' ? (
              <SignoffReportPanel view={reportView} onOpenTab={openTab} />
            ) : current?.target.tab === 'screens' ? (
              <div className="pt-3">
                <ScreensTab
                  pairs={requestPairs}
                  onOpen={setOpenPairKey}
                  capturedLabel={undefined}
                  onRequestImage={evidence.requestImage}
                />
              </div>
            ) : current?.target.tab === 'tests' ? (
              <div className="pt-3">
                <ChecksTab
                  methods={overall.rows.filter((r) => TEST_METHODS.includes(r.id))}
                  checks={testChecks}
                  branch={undefined}
                  busyId={undefined}
                />
              </div>
            ) : current?.target.tab === 'build' ? (
              <div className="pt-3">
                <ChecksTab
                  methods={overall.rows.filter((r) => BUILD_METHODS.includes(r.id))}
                  checks={buildChecks}
                  branch={undefined}
                  busyId={undefined}
                />
              </div>
            ) : current?.target.tab === 'code-review' && storyReview ? (
              <div className="pt-3">
                <CodeReviewPanel
                  review={storyReview}
                  {...(storyReviewVerdict ? { verdict: storyReviewVerdict } : {})}
                />
              </div>
            ) : current?.target.tab === 'walkthrough' ? (
              <div className="pt-3">
                <WalkthroughTab projectId={projectId} recordings={overallSection.recordings} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <ComparisonOverlay
        pairs={overlayPairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={evidence.requestImage}
        projectId={projectId}
      />
    </div>
  )
}
