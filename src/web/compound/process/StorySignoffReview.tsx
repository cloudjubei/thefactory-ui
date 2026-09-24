import { useMemo, useState } from 'react'

import {
  evidenceLoadState,
  featureVerifySectionProps,
  featureVerifyView,
  groupEvidence,
  overlayPairsFor,
  screenPairs,
  storyProofNotice,
  useReviewEvidence,
  useStories,
  useStorySignoff,
  type EvidenceTile,
  type FeatureVerifyView,
  type OverallSignoff,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type ScreenPair,
  type SignoffVerdict,
  type VerifyProofTone,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { IconCheck, IconExclamation, IconInfo, IconShield } from '../../icons'
import { ComparisonOverlay, DurCostChips, IdChip, VerdictBadge } from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** The gate's decision choices — the panel's decide bar acts on the whole story. */
  choices?: readonly ProcessParkChoice[]
  onChoose?: (choice: ProcessResumeChoice) => void
}

const featureOfTile = (t: EvidenceTile): string => t.ref.featureId ?? ''

const VERDICT_DOT: Record<SignoffVerdict['key'], string> = {
  proven: 'bg-(--status-done-soft-fg)',
  partly: 'bg-(--status-review-soft-fg)',
  failed: 'bg-(--status-stuck-soft-fg)',
  'not-run': 'bg-(--status-review-soft-fg)',
}

const DIGEST_TONE: Record<SignoffVerdict['key'], string> = {
  proven: 'border-(--status-done-soft-border) bg-(--status-done-soft-bg)',
  partly: 'border-(--status-review-soft-border) bg-(--status-review-soft-bg)',
  failed: 'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg)',
  'not-run': 'border-(--status-review-soft-border) bg-(--status-review-soft-bg)',
}

const DIGEST_HEAD_TONE: Record<SignoffVerdict['key'], string> = {
  proven: 'text-(--status-done-soft-fg)',
  partly: 'text-(--status-review-soft-fg)',
  failed: 'text-(--status-stuck-soft-fg)',
  'not-run': 'text-(--status-review-soft-fg)',
}

type EvBucket = { pairs: ScreenPair[]; recordings: EvidenceTile[]; reports: EvidenceTile[] }

const NOTICE_TONE: Record<VerifyProofTone, string> = {
  done: 'border-(--status-done-soft-border) bg-(--status-done-soft-bg)',
  working: 'border-(--status-working-soft-border) bg-(--status-working-soft-bg)',
  stuck: 'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg)',
  empty: 'border-(--status-empty-soft-border) bg-(--status-empty-soft-bg)',
}

/**
 * The whole-story sign-off, in the settled design: one `panel` — a head naming
 * the story with its total time + cost, a verdict, a green digest, then the
 * story-wide Overall section and each feature (newest first, collapsible), each
 * with which agents ran it and its evidence behind capability tabs — closing on
 * one decide bar that acts on the WHOLE story, never one approval per feature.
 *
 * The per-feature verdict/cost/agents are JOINED from two list endpoints in
 * {@link useStorySignoff}. A feature's screens are exactly what its verify gate
 * judged on the attempt it was accepted on — never every capture ever filed for
 * it, re-paired by subject. The story's evidence is loaded because a pair's
 * before is often shared from another attempt's run; captures are found by id.
 * Each pair key is namespaced by feature so they stay unique across the one
 * ComparisonOverlay.
 */
export default function StorySignoffReview({
  projectId,
  storyId,
  choices,
  onChoose,
}: StorySignoffReviewProps) {
  const evidence = useReviewEvidence(projectId, { storyId })
  const { signoff } = useStorySignoff(projectId, storyId, evidence.refs)
  const { getStory } = useStories()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const story = getStory(storyId)
  const features = story?.features ?? []

  const bucketByFeature = useMemo(() => {
    const tilesByFeature = new Map<string, EvidenceTile[]>()
    for (const t of evidence.tiles) {
      const id = featureOfTile(t)
      const list = tilesByFeature.get(id)
      if (list) list.push(t)
      else tilesByFeature.set(id, [t])
    }
    const m = new Map<string, EvBucket>()
    for (const [id, tiles] of tilesByFeature) {
      m.set(id, {
        pairs: screenPairs(groupEvidence(tiles)).map((p) => ({ ...p, key: `${id}::${p.key}` })),
        recordings: tiles.filter((t) => t.ref.kind === 'recording'),
        // Only true reports on the Report tab — a `log` is raw tool output, not
        // the verifier's account, and stacking both made the sign-off a wall.
        reports: tiles.filter((t) => t.ref.kind === 'report'),
      })
    }
    return m
  }, [evidence.tiles])

  const evidenceState = evidenceLoadState(evidence)
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

  const emptyBucket: EvBucket = useMemo(() => ({ pairs: [], recordings: [], reports: [] }), [])
  const sectionProps = (bucket: EvBucket, v: FeatureVerifyView | undefined) =>
    v ? featureVerifySectionProps(v) : bucket

  const overallBucket = bucketByFeature.get('') ?? emptyBucket

  // Every feature that ran, newest first (already ordered by the builder), then
  // any feature that filed evidence but produced no attributable run.
  const runBacked = new Set(signoff.features.map((f) => f.featureId))
  const evidenceOnly = [...features]
    .reverse()
    .filter((f) => !runBacked.has(f.id) && bucketByFeature.has(f.id))

  const featureIndex = (id: string): number => features.findIndex((f) => f.id === id) + 1

  const pairGroups = useMemo(() => {
    const groups: ScreenPair[][] = []
    for (const [id, bucket] of bucketByFeature) {
      if (id !== '' && !verifyByFeature.has(id)) groups.push(bucket.pairs)
    }
    for (const v of verifyByFeature.values()) {
      groups.push(v.accepted.evidence.pairs, ...v.others.map((o) => o.evidence.pairs))
    }
    return groups
  }, [bucketByFeature, verifyByFeature])
  const overlayPairs = useMemo(
    () => overlayPairsFor(pairGroups, openPairKey),
    [pairGroups, openPairKey],
  )
  const hasSignoff = signoff.features.length > 0 || signoff.overall !== undefined

  if (evidence.loading && evidence.tiles.length === 0 && !hasSignoff) {
    return <div className="text-[12px] text-(--text-secondary)">Loading the evidence…</div>
  }
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            Verdict — the whole story
          </span>
          <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-(--text-primary)">
            <VerdictBadge verdict={verdict} />
            {verdict.title}
          </span>
          <span className="max-w-[64ch] text-[12.5px] text-(--text-secondary)">
            {verdict.detail}
          </span>
        </div>

        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2.5 ${DIGEST_TONE[verdict.key]}`}
        >
          <span
            className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${DIGEST_HEAD_TONE[verdict.key]}`}
          >
            <IconCheck className="size-4" />
            {signoff.digest.headline}
          </span>
          <span className="text-[12px] text-(--text-secondary)">{signoff.digest.line}</span>
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
              bucket={overallBucket}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
            />
          ) : null}

          {signoff.features.map((f, i) => {
            const bucket = bucketByFeature.get(f.featureId) ?? emptyBucket
            return (
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
                {...sectionProps(bucket, verifyByFeature.get(f.featureId))}
                defaultOpen={i === 0}
                onOpenPair={setOpenPairKey}
                onRequestImage={evidence.requestImage}
              />
            )
          })}

          {evidenceOnly.map((f) => {
            const bucket = bucketByFeature.get(f.id) ?? emptyBucket
            return (
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
                pairs={bucket.pairs}
                recordings={bucket.recordings}
                reports={bucket.reports}
                onOpenPair={setOpenPairKey}
                onRequestImage={evidence.requestImage}
              />
            )
          })}
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

/** The story-wide Overall section — the whole-codebase checks + the walkthrough. */
function OverallSection({
  projectId,
  overall,
  bucket,
  onOpenPair,
  onRequestImage,
}: {
  projectId: string
  overall: OverallSignoff
  bucket: EvBucket
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
      statusLine={
        overall.allGreen
          ? { tone: 'done', label: 'All green' }
          : { tone: 'stuck', label: 'Checks failed' }
      }
      // The Overall never shows per-feature screens — its evidence is the
      // end-to-end walkthrough (and any story-wide report).
      pairs={[]}
      recordings={bucket.recordings}
      reports={bucket.reports}
      onOpenPair={onOpenPair}
      onRequestImage={onRequestImage}
    />
  )
}
