import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

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
  ranReviewChecks,
  REQUEST_PROOF_CHOICES,
  requestChangesProofPreset,
  reviewCheckGroups,
  reviewTabOrder,
  reviewTabs,
  signoffAttentionItems,
  signoffDecisionItems,
  signoffEvidenceChips,
  signoffFeatureRow,
  signoffFeaturesDelivered,
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
  SIGNOFF_LOADING,
  SIGNOFF_REJECT_CONFIRM,
  SIGNOFF_REJECT_CONFIRM_LABEL,
  SIGNOFF_SECTION_TITLES,
  uiChangeScopeOf,
  useProjects,
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
  type ReviewTabId,
  type ScreenPair,
  type SignoffFeatureRowView,
  type SignoffSection,
  type SignoffStepTarget,
  type StorySignoff,
  type UseReviewEvidence,
} from '../../../headless'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { IconChevronRight } from '../../icons'
import type { ProjectChecksListing } from '../../../headless/api'
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
import DependencyRef from '../stories/DependencyRef'
import FeatureReviewSection from './FeatureReviewSection'
import IntegrationChooser from './IntegrationChooser'
import ParkNoteComposer from './ParkNoteComposer'
import ProofPlanMarks from './ProofPlanMarks'
import CodeReviewPanel from './signoff/CodeReviewPanel'
import Pill from './signoff/Pill'
import SignoffDecisionList from './signoff/SignoffDecisionList'
import SignoffReportPanel from './signoff/SignoffReportPanel'
import StorySpecCard from './signoff/StorySpecCard'

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
  /** Open a step's output on its own screen — the fix pass chip's target. */
  onOpenStep?: (target: SignoffStepTarget) => void
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

/**
 * Native peer of web's `StorySignoffReview`: the decision (verdict, the three
 * decisions, only what needs a look), "What this is" (the story and each
 * feature with its proof plan, criteria and own evidence on demand), and the
 * story-wide evidence behind chips that are its tabs. Nothing is drawn until
 * the runs, the story and the evidence have all loaded.
 */
export default function StorySignoffReview(props: StorySignoffReviewProps) {
  const { projectId, storyId, storyRunId } = props
  const { theme } = useNativeTheme()
  const evidence = useReviewEvidence(projectId, { storyId })
  const evidenceState = evidenceLoadState(evidence)
  const projectChecks = useProjectChecks(projectId)
  const { signoff, status, error } = useStorySignoff(
    projectId,
    storyId,
    storyRunId,
    evidence.refs,
    evidenceState,
    projectChecks,
  )
  if (!signoff) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {status === 'failed'
          ? `${SIGNOFF_LOAD_FAILED}${error ? ` — ${error}` : ''}`
          : SIGNOFF_LOADING}
      </Text>
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
  onSaveFile,
  onOpenStep,
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
  const soleMode = workBranch?.shadow
    ? soleIntegrationMode(workBranch, integrationModes)
    : undefined

  const story = getStory(storyId)
  const features = story?.features ?? []
  const proofPreset = requestChangesProofPreset({
    features,
    scope: uiChangeScopeOf(projects.find((p) => p.id === projectId)?.metadata),
    plannedKinds: signoff.features.flatMap((f) => f.proofPlan?.map((r) => r.kind) ?? []),
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
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        No evidence was filed for this story’s features.
      </Text>
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

  return (
    <View style={{ gap: 14 }}>
      <View accessibilityLabel="Decision" style={card}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <VerdictBadge verdict={signoff.verdict} tally={signoff.digest.tally} />
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {SIGNOFF_DECISION_LABEL}
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
            {headline}
          </Text>
          {signoff.headline?.detail ? (
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {signoff.headline.detail}
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
        </View>

        {canDecide && step === 'idle' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {offered.map((c) => (
              <Button
                key={c.choice}
                size="md"
                variant={c.primary ? 'primary' : c.choice === 'reject' ? 'ghost' : 'secondary'}
                accessibilityHint={c.detail}
                disabled={busy}
                onPress={() =>
                  c.choice === 'approve' && workBranch
                    ? soleMode
                      ? decide('approve', undefined, { mode: soleMode })
                      : setStep('integration')
                    : c.choice === 'reject'
                      ? setStep('reject')
                      : choiceTakesNote(c.choice)
                        ? setStep('note')
                        : decide(c.choice)
                }
              >
                {c.choice === 'approve' ? SIGNOFF_APPROVE_LABEL : c.label}
              </Button>
            ))}
          </View>
        ) : null}

        {canDecide && step === 'note' ? (
          <ParkNoteComposer
            proofChoices={REQUEST_PROOF_CHOICES}
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

        {canDecide && step === 'reject' ? (
          <View
            style={{
              gap: 10,
              padding: 12,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: status.stuck.softBorder,
              backgroundColor: status.stuck.softBg,
            }}
          >
            <Text style={{ fontSize: 13, color: status.stuck.softFg }}>
              {SIGNOFF_REJECT_CONFIRM}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="sm" variant="secondary" disabled={busy} onPress={() => setStep('idle')}>
                {SIGNOFF_CANCEL_LABEL}
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onPress={() => decide('reject')}>
                {SIGNOFF_REJECT_CONFIRM_LABEL}
              </Button>
            </View>
          </View>
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
                accessibilityLabel="Open the group run"
                onPress={mergeHold.onOpenGroup}
              >
                Group
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
      </View>

      <View accessibilityLabel={SIGNOFF_SECTION_TITLES.what} style={card}>
        <StorySpecCard
          projectId={projectId}
          storyId={storyId}
          title={story?.title ?? 'Story'}
          description={story?.description}
          features={features}
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

      {overall && chips.length > 0 ? (
        <View accessibilityLabel={SIGNOFF_SECTION_TITLES.evidence} style={card}>
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            {chips.map((chip) => (
              <CheckChip
                key={chip.key}
                row={chip.row}
                selected={isEvidenceChipSelected(chip, chipKey, chips)}
                onPress={() => setChipKey(chip.key)}
              />
            ))}
          </View>
          {current?.target.kind === 'missing' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
                {current.target.title}
              </Text>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                {current.target.text}
              </Text>
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
            <ChecksTab
              methods={overall.rows.filter((r) => TEST_METHODS.includes(r.id))}
              checks={testChecks}
              branch={undefined}
              busyId={undefined}
            />
          ) : current?.target.tab === 'build' ? (
            <ChecksTab
              methods={overall.rows.filter((r) => BUILD_METHODS.includes(r.id))}
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
            <WalkthroughTab recordings={overallSection.recordings} />
          ) : null}
        </View>
      ) : null}

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
    </View>
  )
}
