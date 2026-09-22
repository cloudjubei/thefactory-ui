import { useMemo, useState } from 'react'

import {
  groupEvidence,
  screenPairs,
  useReviewEvidence,
  useStories,
  useStorySignoff,
  type EvidenceTile,
  type FeatureSignoff,
  type ScreenPair,
  type StoryDigest,
} from '../../../headless'
import { ComparisonOverlay, VerdictBadge } from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
}

const featureOfTile = (t: EvidenceTile): string => t.ref.featureId ?? ''

/** Cost + duration, together, as the trailing fact of a header row. */
function Facts({ costLabel, durationLabel }: { costLabel?: string; durationLabel?: string }) {
  if (!costLabel && !durationLabel) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums">
      {durationLabel ? <span className="text-(--text-secondary)">{durationLabel}</span> : null}
      {durationLabel && costLabel ? (
        <span aria-hidden className="text-(--text-tertiary)">
          ·
        </span>
      ) : null}
      {costLabel ? <span className="font-medium text-(--text-primary)">{costLabel}</span> : null}
    </span>
  )
}

const DIGEST_TONE: Record<'proven' | 'partly' | 'failed' | 'notRun', string> = {
  proven: 'bg-(--status-done-soft-bg) text-(--status-done-soft-fg)',
  partly: 'bg-(--status-review-soft-bg) text-(--status-review-soft-fg)',
  failed: 'bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)',
  notRun: 'bg-(--surface-sunken) text-(--text-muted)',
}

/** The one-glance pass/fail summary — only the states that actually occurred. */
function DigestStrip({ digest }: { digest: StoryDigest }) {
  const all: { key: keyof typeof DIGEST_TONE; n: number; label: string }[] = [
    { key: 'failed', n: digest.failed, label: 'failed' },
    { key: 'partly', n: digest.partly, label: 'partly' },
    { key: 'notRun', n: digest.notRun, label: 'not run' },
    { key: 'proven', n: digest.proven, label: 'proven' },
  ]
  const chips = all.filter((c) => c.n > 0)
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${DIGEST_TONE[c.key]}`}
        >
          {c.n} {c.label}
        </span>
      ))}
    </div>
  )
}

type Section = {
  id: string
  title: string
  signoff: FeatureSignoff | undefined
  pairs: ScreenPair[]
  recordings: EvidenceTile[]
  reports: EvidenceTile[]
}

/**
 * The evidence + verdict the WHOLE story produced, gathered for its single
 * sign-off.
 *
 * A story is one unit of work even when it was split into features, so its
 * sign-off is one decision over everything — never one approval per feature. The
 * header carries the aggregate verdict, a pass/fail digest and the story-total
 * cost/duration; then each feature is a section, NEWEST FIRST, with its own
 * verdict, model and cost, above its screens/walkthroughs/reports.
 *
 * The per-feature verdict/cost is JOINED from two list endpoints in
 * {@link useStorySignoff}; the evidence is grouped PER FEATURE (subjects would
 * otherwise collide across features) and each feature's pair keys are namespaced
 * by featureId so they stay unique across the one ComparisonOverlay.
 */
export default function StorySignoffReview({ projectId, storyId }: StorySignoffReviewProps) {
  const evidence = useReviewEvidence(projectId, { storyId })
  const { signoff } = useStorySignoff(projectId, storyId, evidence.refs)
  const { getStory } = useStories()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const features = getStory(storyId)?.features ?? []

  const evByFeature = useMemo(() => {
    const m = new Map<string, EvidenceTile[]>()
    for (const t of evidence.tiles) {
      const id = featureOfTile(t)
      const list = m.get(id)
      if (list) list.push(t)
      else m.set(id, [t])
    }
    return m
  }, [evidence.tiles])

  const signoffByFeature = useMemo(
    () => new Map(signoff.features.map((f) => [f.featureId, f])),
    [signoff.features],
  )

  const sections = useMemo<Section[]>(() => {
    const order: string[] = []
    const seen = new Set<string>()
    // Run-backed features first, newest-first (the sign-off already orders them).
    for (const f of signoff.features) {
      order.push(f.featureId)
      seen.add(f.featureId)
    }
    // Then features that filed evidence but produced no attributable run, still
    // newest-first; then anything unattributed.
    for (const f of [...features].reverse()) {
      if (!seen.has(f.id) && evByFeature.has(f.id)) {
        order.push(f.id)
        seen.add(f.id)
      }
    }
    for (const id of evByFeature.keys()) {
      if (!seen.has(id)) {
        order.push(id)
        seen.add(id)
      }
    }
    // The story-scoped (no-featureId) bucket is the OVERALL walkthrough of the
    // whole story — show it FIRST, as the summary above the per-feature sections.
    const ordered = [...order.filter((id) => id === ''), ...order.filter((id) => id !== '')]
    return ordered.map((id) => {
      const tiles = evByFeature.get(id) ?? []
      const pairs: ScreenPair[] = screenPairs(groupEvidence(tiles)).map((p) => ({
        ...p,
        key: `${id}::${p.key}`,
      }))
      const fs = signoffByFeature.get(id)
      return {
        id,
        signoff: fs,
        title:
          fs?.title ??
          features.find((f) => f.id === id)?.title ??
          (id ? 'Other evidence' : 'Overall'),
        pairs,
        recordings: tiles.filter((t) => t.ref.kind === 'recording'),
        reports: tiles.filter((t) => t.ref.kind === 'report' || t.ref.kind === 'log'),
      }
    })
  }, [signoff.features, signoffByFeature, features, evByFeature])

  const allPairs = useMemo(() => sections.flatMap((s) => s.pairs), [sections])
  const hasSignoff = signoff.features.length > 0

  if (evidence.loading && evidence.tiles.length === 0 && !hasSignoff) {
    return <div className="text-[12px] text-(--text-secondary)">Loading the evidence…</div>
  }
  if (sections.length === 0) {
    return (
      <div className="text-[12px] text-(--text-secondary)">
        No evidence was filed for this story’s features.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {hasSignoff ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={signoff.verdict} />
            <span className="text-[14px] font-semibold text-(--text-primary)">
              {signoff.verdict.title}
            </span>
            <span className="flex-1" />
            <Facts
              costLabel={signoff.facts.costLabel}
              durationLabel={signoff.facts.durationLabel}
            />
          </div>
          <p className="max-w-[64ch] text-[12.5px] text-(--text-secondary)">
            {signoff.verdict.detail}
          </p>
          <DigestStrip digest={signoff.digest} />
        </div>
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          Evidence for the whole story
        </span>
      )}

      {sections.map((s) => (
        <FeatureReviewSection
          key={s.id || 'unattributed'}
          projectId={projectId}
          title={s.title}
          signoff={s.signoff}
          pairs={s.pairs}
          recordings={s.recordings}
          reports={s.reports}
          onOpenPair={setOpenPairKey}
          onRequestImage={evidence.requestImage}
        />
      ))}
      <ComparisonOverlay
        pairs={allPairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        // Story-aggregated evidence spans features on different branches, so there
        // is no one base/head sha — the overlay uses these only for caption chips.
        baseSha={undefined}
        headSha={undefined}
        onRequestImage={evidence.requestImage}
        projectId={projectId}
      />
    </div>
  )
}
