import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import {
  choiceTakesNote,
  EMPTY_SIGNOFF_SECTION,
  evidenceLoadState,
  overlayPairsFor,
  signoffFixSectionProps,
  signoffSectionProps,
  signoffSections,
  signoffVerifyViews,
  SIGNOFF_LOAD_FAILED,
  SIGNOFF_LOADING,
  storyProofNotice,
  useReviewEvidence,
  useStories,
  useStorySignoff,
  type EvidenceLoadState,
  type OverallSignoff,
  type ProcessIntegrationMode,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type ProcessWorkBranch,
  type ScreenPair,
  type SignoffSection,
  type SignoffVerdict,
  type StorySignoff,
  type UseReviewEvidence,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { IconExclamation } from '../../icons/IconExclamation'
import { IconInfo } from '../../icons/IconInfo'
import { IconShield } from '../../icons/IconShield'
import {
  ComparisonOverlay,
  DurCostChips,
  IdChip,
  VerdictBadge,
  type SaveFileHandler,
} from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'
import IntegrationChooser from './IntegrationChooser'
import ParkNoteComposer from './ParkNoteComposer'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** The story run being signed off — each feature shows where its run under it stands. */
  storyRunId: string
  /** The gate's decision choices — the panel's decide bar acts on the whole story. */
  choices?: readonly ProcessParkChoice[]
  /** The gate sends the story back to be fixed when changes are requested, rather than ending it. */
  sendsBack?: boolean
  /** Set when approving must say how the work comes in — the run's work branch. */
  workBranch?: Pick<ProcessWorkBranch, 'name' | 'baseRef'>
  onChoose?: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationMode,
  ) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
}

const VERDICT_TONE: Record<SignoffVerdict['key'], 'done' | 'review' | 'stuck'> = {
  proven: 'done',
  partly: 'review',
  failed: 'stuck',
  'not-run': 'review',
}

/**
 * The whole-story sign-off — the native peer of the web `StorySignoffReview`. One
 * panel: a head naming the story with its total time + cost, a verdict badge
 * carrying its tally (and a line under it only when the outcome needs
 * explaining), then the story-wide Overall section and each feature (newest first,
 * collapsible), each with which agents ran it and its evidence behind capability
 * tabs — closing on one decide bar that acts on the WHOLE story. Each feature
 * shows its LATEST run only; earlier runs stay in the pipeline for whoever
 * drills in. A feature's screens are exactly what its verify gate judged on the
 * accepted attempt, found by id in the story's evidence. Nothing is drawn until
 * the runs, the story and the evidence have all loaded: a verdict computed from
 * part of them is wrong, and it flips once the rest lands.
 */
export default function StorySignoffReview(props: StorySignoffReviewProps) {
  const { projectId, storyId, storyRunId } = props
  const { theme } = useNativeTheme()
  const evidence = useReviewEvidence(projectId, { storyId })
  const evidenceState = evidenceLoadState(evidence)
  const { signoff, status, error } = useStorySignoff(
    projectId,
    storyId,
    storyRunId,
    evidence.refs,
    evidenceState,
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
    />
  )
}

function StorySignoffPanel({
  projectId,
  storyId,
  choices,
  sendsBack = false,
  workBranch,
  onChoose,
  onSaveFile,
  signoff,
  evidence,
  evidenceState,
}: StorySignoffReviewProps & {
  signoff: StorySignoff
  evidence: UseReviewEvidence
  evidenceState: EvidenceLoadState
}) {
  const { theme, status } = useNativeTheme()
  const { getStory } = useStories()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
  const [choosingIntegration, setChoosingIntegration] = useState(false)

  const story = getStory(storyId)
  const features = story?.features ?? []

  const sections = useMemo(
    () => signoffSections(signoff, evidence.tiles),
    [signoff, evidence.tiles],
  )

  const verifyBySection = useMemo(
    () => signoffVerifyViews(signoff, evidence.tiles, evidenceState),
    [signoff, evidence.tiles, evidenceState],
  )

  const sectionOf = (id: string): SignoffSection => sections.get(id) ?? EMPTY_SIGNOFF_SECTION

  const runBacked = new Set(signoff.features.map((f) => f.featureId))
  const evidenceOnly = [...features]
    .reverse()
    .filter((f) => !runBacked.has(f.id) && sections.has(f.id))
  const featureIndex = (id: string): number => features.findIndex((f) => f.id === id) + 1

  const pairGroups = useMemo(() => {
    const groups: ScreenPair[][] = []
    for (const [id, section] of sections) {
      if (id !== '' && !verifyBySection.has(id)) groups.push(section.pairs)
    }
    for (const v of verifyBySection.values()) {
      groups.push(v.accepted.evidence.pairs)
    }
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

  const verdict = signoff.verdict
  const tone = VERDICT_TONE[verdict.key]
  const storyLabel = story?.title ? `Story · ${story.title}` : 'Story'
  const proofNotice = storyProofNotice(
    [
      ...signoff.fixes.map((f) => ({ id: f.sectionId, label: f.label })),
      ...signoff.features.map((f) => ({
        id: f.featureId,
        label: `Feature #${featureIndex(f.featureId)}`,
      })),
    ].flatMap(({ id, label }) => {
      const v = verifyBySection.get(id)
      return v
        ? [
            {
              label,
              mode: v.mode,
              standing: v.standing,
              dataUnstated: v.dataUnstated,
            },
          ]
        : []
    }),
  )

  return (
    <View
      style={{
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      {/* panel-head */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <View
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status[tone].softFg }}
        />
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
          Sign-off
        </Text>
        <IdChip kind="story">{storyLabel}</IdChip>
        <View style={{ flex: 1 }} />
        <DurCostChips facts={signoff.facts} />
      </View>

      {/* panel-in */}
      <View style={{ backgroundColor: theme.surface.base, padding: 14, gap: 12 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <VerdictBadge verdict={verdict} tally={signoff.digest.tally} />
            {signoff.headline ? (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text.primary,
                  flexShrink: 1,
                }}
              >
                {signoff.headline.title}
              </Text>
            ) : null}
          </View>
          {signoff.headline ? (
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {signoff.headline.detail}
            </Text>
          ) : null}
        </View>

        {proofNotice ? (
          <View
            accessibilityRole="summary"
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: status[proofNotice.tone].softBorder,
              backgroundColor: status[proofNotice.tone].softBg,
            }}
          >
            {proofNotice.tone === 'working' ? (
              <IconExclamation size={16} />
            ) : (
              <IconInfo size={16} color={theme.text.secondary} />
            )}
            <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.primary }}>
              {proofNotice.text}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <IconShield size={14} color={theme.text.muted} />
          <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.muted }}>
            Each feature went through the review process — how it was checked, live or dry, is on
            the feature. Expand one to inspect its evidence.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {signoff.overall ? (
            <OverallSection
              overall={signoff.overall}
              section={sectionOf('')}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
              onSaveFile={onSaveFile}
            />
          ) : null}

          {signoff.fixes.map((f) => (
            <FeatureReviewSection
              key={f.sectionId}
              kind="feature"
              idLabel={f.label}
              idScope="story"
              title={f.title}
              facts={f.facts}
              agents={f.agents}
              rows={f.rows}
              verification={f.verification}
              statusLine={f.statusLine}
              {...signoffFixSectionProps(
                sectionOf(f.sectionId),
                verifyBySection.get(f.sectionId),
                f,
              )}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
              onSaveFile={onSaveFile}
            />
          ))}

          {signoff.features.map((f) => (
            <FeatureReviewSection
              key={f.featureId}
              kind="feature"
              idLabel={`Feature #${featureIndex(f.featureId)}`}
              title={f.title}
              facts={f.facts}
              agents={f.agents}
              rows={f.rows}
              verification={f.verification}
              statusLine={f.statusLine}
              {...signoffSectionProps(
                sectionOf(f.featureId),
                verifyBySection.get(f.featureId),
                f.codeReview,
              )}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
              onSaveFile={onSaveFile}
            />
          ))}

          {evidenceOnly.map((f) => (
            <FeatureReviewSection
              key={f.id}
              kind="feature"
              idLabel={`Feature #${featureIndex(f.id)}`}
              title={f.title}
              facts={{ costLabel: undefined, durationLabel: undefined }}
              agents={[]}
              rows={[]}
              verification={undefined}
              statusLine={{ tone: 'review', label: 'Not verified' }}
              {...signoffSectionProps(sectionOf(f.id), undefined)}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
              onSaveFile={onSaveFile}
            />
          ))}
        </View>
      </View>

      {/* decide bar */}
      {choices && choices.length > 0 && onChoose ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          {noteFor ? (
            <ParkNoteComposer
              sendsBack={sendsBack}
              onSend={(note) => onChoose(noteFor, note)}
              onCancel={() => setNoteFor(undefined)}
            />
          ) : choosingIntegration && workBranch ? (
            <IntegrationChooser
              workBranch={workBranch}
              onChoose={(mode) => onChoose('approve', undefined, mode)}
              onCancel={() => setChoosingIntegration(false)}
            />
          ) : (
            choices.map((c) => (
              <Button
                key={c.choice}
                size="sm"
                variant={c.primary ? 'primary' : c.choice === 'reject' ? 'ghost' : 'secondary'}
                accessibilityHint={c.detail}
                onPress={() =>
                  c.choice === 'approve' && workBranch
                    ? setChoosingIntegration(true)
                    : choiceTakesNote(c.choice)
                      ? setNoteFor(c.choice)
                      : onChoose(c.choice)
                }
              >
                {c.label}
              </Button>
            ))
          )}
        </View>
      ) : null}

      <ComparisonOverlay
        pairs={overlayPairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={evidence.requestImage}
        onSaveFile={onSaveFile}
        projectId={projectId}
      />
    </View>
  )
}

function OverallSection({
  overall,
  section,
  onOpenPair,
  onRequestImage,
  onSaveFile,
}: {
  overall: OverallSignoff
  section: SignoffSection
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  onSaveFile?: SaveFileHandler
}) {
  return (
    <FeatureReviewSection
      kind="overall"
      title="Story-wide checks"
      facts={overall.facts}
      agents={overall.agents}
      rows={overall.rows}
      verification={overall.verification}
      statusLine={overall.statusLine}
      steps={overall.steps}
      pairs={[]}
      recordings={section.recordings}
      reports={section.reports}
      codeReviews={section.codeReviews}
      leadTab={section.leadTab}
      onOpenPair={onOpenPair}
      onRequestImage={onRequestImage}
      onSaveFile={onSaveFile}
    />
  )
}
