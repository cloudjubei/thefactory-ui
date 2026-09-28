import { useMemo, useState } from 'react'

import {
  EMPTY_SIGNOFF_SECTION,
  evidenceLoadState,
  featureVerifyView,
  overlayPairsFor,
  signoffSectionProps,
  signoffSections,
  SIGNOFF_LOAD_FAILED,
  SIGNOFF_LOADING,
  storyProofNotice,
  useReviewEvidence,
  useStories,
  useStorySignoff,
  type EvidenceLoadState,
  type FeatureVerifyView,
  type OverallSignoff,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type ScreenPair,
  type SignoffSection,
  type SignoffVerdict,
  type StorySignoff,
  type UseReviewEvidence,
  type VerifyProofTone,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { IconExclamation, IconInfo, IconShield } from '../../icons'
import { ComparisonOverlay, DurCostChips, IdChip, VerdictBadge } from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** The story run being signed off — each feature shows where its run under it stands. */
  storyRunId: string
  /** The gate's decision choices — the panel's decide bar acts on the whole story. */
  choices?: readonly ProcessParkChoice[]
  onChoose?: (choice: ProcessResumeChoice) => void
}

const VERDICT_DOT: Record<SignoffVerdict['key'], string> = {
  proven: 'bg-(--status-done-soft-fg)',
  partly: 'bg-(--status-review-soft-fg)',
  failed: 'bg-(--status-stuck-soft-fg)',
  'not-run': 'bg-(--status-review-soft-fg)',
}

const NOTICE_TONE: Record<VerifyProofTone, string> = {
  done: 'border-(--status-done-soft-border) bg-(--status-done-soft-bg)',
  working: 'border-(--status-working-soft-border) bg-(--status-working-soft-bg)',
  stuck: 'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg)',
  empty: 'border-(--status-empty-soft-border) bg-(--status-empty-soft-bg)',
}

/**
 * The whole-story sign-off, in the settled design: one `panel` — a head naming
 * the story with its total time + cost, a verdict badge carrying its tally (and
 * a line under it only when the outcome needs explaining), then the story-wide
 * Overall section and each feature (newest first, collapsible), each
 * with which agents ran it and its evidence behind capability tabs — closing on
 * one decide bar that acts on the WHOLE story, never one approval per feature.
 *
 * The per-feature verdict/cost/agents are JOINED from two list endpoints in
 * {@link useStorySignoff}, from each feature's LATEST run only — earlier runs'
 * attempts, reports and captures stay in the pipeline for whoever drills in. A
 * feature's screens are exactly what its verify gate judged on the attempt it
 * was accepted on — never every capture ever filed for it, re-paired by subject. The story's evidence is loaded because a pair's
 * before is often shared from another attempt's run; captures are found by id.
 * Each pair key is namespaced by feature so they stay unique across the one
 * ComparisonOverlay.
 *
 * Nothing is drawn until the runs, the story and the evidence have all loaded:
 * a verdict computed from part of them is wrong, and it flips once the rest lands.
 */
export default function StorySignoffReview(props: StorySignoffReviewProps) {
  const { projectId, storyId, storyRunId } = props
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
      <div className="text-[12px] text-(--text-secondary)">
        {status === 'failed'
          ? `${SIGNOFF_LOAD_FAILED}${error ? ` — ${error}` : ''}`
          : SIGNOFF_LOADING}
      </div>
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
  onChoose,
  signoff,
  evidence,
  evidenceState,
}: StorySignoffReviewProps & {
  signoff: StorySignoff
  evidence: UseReviewEvidence
  evidenceState: EvidenceLoadState
}) {
  const { getStory } = useStories()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const story = getStory(storyId)
  const features = story?.features ?? []

  const sections = useMemo(
    () => signoffSections(signoff, evidence.tiles),
    [signoff, evidence.tiles],
  )

  const verifyByFeature = useMemo(() => {
    const m = new Map<string, FeatureVerifyView>()
    for (const f of signoff.features) {
      if (f.verify)
        m.set(
          f.featureId,
          featureVerifyView(f.verify, evidence.tiles, {
            keyPrefix: `${f.featureId}::`,
            evidence: evidenceState,
          }),
        )
    }
    return m
  }, [signoff.features, evidence.tiles, evidenceState])

  const sectionOf = (id: string): SignoffSection => sections.get(id) ?? EMPTY_SIGNOFF_SECTION

  const runBacked = new Set(signoff.features.map((f) => f.featureId))
  const evidenceOnly = [...features]
    .reverse()
    .filter((f) => !runBacked.has(f.id) && sections.has(f.id))

  const featureIndex = (id: string): number => features.findIndex((f) => f.id === id) + 1

  const pairGroups = useMemo(() => {
    const groups: ScreenPair[][] = []
    for (const [id, section] of sections) {
      if (id !== '' && !verifyByFeature.has(id)) groups.push(section.pairs)
    }
    for (const v of verifyByFeature.values()) {
      groups.push(v.accepted.evidence.pairs)
    }
    return groups
  }, [sections, verifyByFeature])
  const overlayPairs = useMemo(
    () => overlayPairsFor(pairGroups, openPairKey),
    [pairGroups, openPairKey],
  )
  const hasSignoff = signoff.features.length > 0 || signoff.overall !== undefined

  if (!hasSignoff && evidence.tiles.length === 0) {
    return (
      <div className="text-[12px] text-(--text-secondary)">
        No evidence was filed for this story’s features.
      </div>
    )
  }

  const verdict = signoff.verdict
  const storyLabel = story?.title ? `Story · ${story.title}` : 'Story'
  const proofNotice = storyProofNotice(
    signoff.features.flatMap((f) => {
      const v = verifyByFeature.get(f.featureId)
      return v
        ? [
            {
              label: `Feature #${featureIndex(f.featureId)}`,
              mode: v.mode,
              standing: v.standing,
              dataUnstated: v.dataUnstated,
              proofUnvouched: v.proofUnvouched,
            },
          ]
        : []
    }),
  )

  return (
    <div className="overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-raised) shadow-md">
      {/* panel-head */}
      <div className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-3.5 py-2.5">
        <span
          className={`size-1.5 shrink-0 rounded-full ${VERDICT_DOT[verdict.key]}`}
          aria-hidden
        />
        <span className="text-[13.5px] font-semibold text-(--text-primary)">Sign-off</span>
        <IdChip kind="story">{storyLabel}</IdChip>
        <span className="min-w-0 flex-1" />
        <DurCostChips facts={signoff.facts} />
      </div>

      {/* panel-in */}
      <div className="flex flex-col gap-3 bg-(--surface-base) p-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-(--text-primary)">
            <VerdictBadge verdict={verdict} tally={signoff.digest.tally} />
            {signoff.headline?.title}
          </span>
          {signoff.headline ? (
            <span className="max-w-[64ch] text-[12.5px] text-(--text-secondary)">
              {signoff.headline.detail}
            </span>
          ) : null}
        </div>

        {proofNotice ? (
          <div
            role="note"
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${NOTICE_TONE[proofNotice.tone]}`}
          >
            {proofNotice.tone === 'working' ? (
              <IconExclamation className="mt-px size-4 shrink-0" />
            ) : (
              <IconInfo className="mt-px size-4 shrink-0 text-(--text-secondary)" />
            )}
            <span className="max-w-[72ch] text-[12.5px] text-(--text-primary)">
              {proofNotice.text}
            </span>
          </div>
        ) : null}

        <div className="flex items-start gap-1.5 text-[11.5px] text-(--text-muted)">
          <IconShield className="mt-px size-3.5 shrink-0" />
          <span>
            Each feature went through the review process — how it was checked, live or dry, is on
            the feature. Expand one to inspect its evidence.
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {signoff.overall ? (
            <OverallSection
              projectId={projectId}
              overall={signoff.overall}
              section={sectionOf('')}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
            />
          ) : null}

          {signoff.features.map((f, i) => (
            <FeatureReviewSection
              key={f.featureId}
              projectId={projectId}
              kind="feature"
              idLabel={`Feature #${featureIndex(f.featureId)}`}
              title={f.title}
              facts={f.facts}
              agents={f.agents}
              rows={f.rows}
              verification={f.verification}
              statusLine={f.statusLine}
              {...signoffSectionProps(sectionOf(f.featureId), verifyByFeature.get(f.featureId))}
              defaultOpen={i === 0}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
            />
          ))}

          {evidenceOnly.map((f) => (
            <FeatureReviewSection
              key={f.id}
              projectId={projectId}
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
            />
          ))}
        </div>
      </div>

      {/* decide bar — acts on the WHOLE story */}
      {choices && choices.length > 0 && onChoose ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-(--border-subtle) px-3.5 py-2.5">
          {choices.map((c) => (
            <Button
              key={c.choice}
              size="sm"
              variant={c.primary ? 'primary' : c.choice === 'reject' ? 'ghost' : 'secondary'}
              className={c.choice === 'reject' ? 'ml-auto' : undefined}
              title={c.detail}
              onClick={() => onChoose(c.choice)}
            >
              {c.label}
            </Button>
          ))}
        </div>
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

/**
 * The story-wide Overall section — the whole-codebase checks, the walkthrough,
 * the code review and the final report, and how each of its steps ended.
 */
function OverallSection({
  projectId,
  overall,
  section,
  onOpenPair,
  onRequestImage,
}: {
  projectId: string
  overall: OverallSignoff
  section: SignoffSection
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}) {
  return (
    <FeatureReviewSection
      projectId={projectId}
      kind="overall"
      title="Story-wide checks"
      facts={overall.facts}
      agents={overall.agents}
      rows={overall.rows}
      verification={overall.verification}
      statusLine={overall.statusLine}
      notes={overall.notes}
      // The Overall never shows per-feature screens — its evidence is the
      // end-to-end walkthrough, the final report and the story's code review.
      pairs={[]}
      recordings={section.recordings}
      reports={section.reports}
      codeReviews={section.codeReviews}
      leadTab={section.leadTab}
      onOpenPair={onOpenPair}
      onRequestImage={onRequestImage}
    />
  )
}
