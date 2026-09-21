import { useMemo, useState } from 'react'

import {
  groupEvidence,
  screenPairs,
  useReviewEvidence,
  useStories,
  type EvidenceTile,
  type ScreenPair,
} from '../../../headless'
import { ComparisonOverlay, ReportTab, ScreensTab, WalkthroughTab } from '../chat/signoff'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
}

const featureOfTile = (t: EvidenceTile): string => t.ref.featureId ?? ''

/**
 * The evidence the WHOLE story produced, gathered for its single sign-off.
 *
 * A story is one unit of work even when it was split into features, so its
 * sign-off is one decision over everything — never one approval per feature (which
 * would let a reviewer approve parts 1 and 3 and leave part 2 out, landing a
 * half-applied change). This shows every feature's proof — screens, walkthroughs
 * and written reports, grouped and titled per feature — above the gate's one
 * Approve / Reject.
 *
 * Grouping is done PER FEATURE (not story-wide) because `groupEvidence` keys only
 * on the free-form `subject`: two features that touch the same screen (subject
 * "cart") would otherwise merge into one before/after and mis-attribute — or
 * lose — each other's proof. Each feature's pair keys are then namespaced by
 * featureId so they stay unique across the single ComparisonOverlay.
 */
export default function StorySignoffReview({ projectId, storyId }: StorySignoffReviewProps) {
  const evidence = useReviewEvidence(projectId, { storyId })
  const { getStory } = useStories()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()

  const features = getStory(storyId)?.features ?? []

  const groups = useMemo(() => {
    const byFeature = new Map<string, EvidenceTile[]>()
    for (const t of evidence.tiles) {
      const id = featureOfTile(t)
      const list = byFeature.get(id)
      if (list) list.push(t)
      else byFeature.set(id, [t])
    }
    const ordered = [
      ...features.map((f) => f.id).filter((id) => byFeature.has(id)),
      // Anything the story's feature list doesn't name (unattributed, or a feature
      // since removed) still has to be reviewed — it goes last.
      ...[...byFeature.keys()].filter((id) => !features.some((f) => f.id === id)),
    ]
    return ordered.map((id) => {
      const tiles = byFeature.get(id) ?? []
      // Group + pair WITHIN the feature so subjects can never collide across
      // features; then namespace the key so it is unique in `allPairs`.
      const pairs: ScreenPair[] = screenPairs(groupEvidence(tiles)).map((p) => ({
        ...p,
        key: `${id}::${p.key}`,
      }))
      return {
        id,
        title:
          features.find((f) => f.id === id)?.title ??
          (id ? 'Other evidence' : 'Unattributed evidence'),
        pairs,
        recordings: tiles.filter((t) => t.ref.kind === 'recording'),
        // A verifier's written proof is a `report`, or a `log` when it typed a
        // note without a device — both belong in the written column.
        reports: tiles.filter((t) => t.ref.kind === 'report' || t.ref.kind === 'log'),
      }
    })
  }, [features, evidence.tiles])

  const allPairs = useMemo(() => groups.flatMap((g) => g.pairs), [groups])

  if (evidence.loading && evidence.tiles.length === 0) {
    return <div className="text-[12px] text-(--text-secondary)">Loading the evidence…</div>
  }
  if (evidence.tiles.length === 0) {
    return (
      <div className="text-[12px] text-(--text-secondary)">
        No evidence was filed for this story’s features.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        Evidence for the whole story
      </span>
      {groups.map((g) => (
        <section
          key={g.id || 'unattributed'}
          className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5"
        >
          <h4 className="m-0 text-[12.5px] font-semibold text-(--text-primary)">{g.title}</h4>
          {g.pairs.length > 0 ? (
            <ScreensTab
              pairs={g.pairs}
              onOpen={setOpenPairKey}
              capturedLabel={undefined}
              capturing={false}
            />
          ) : null}
          {g.recordings.length > 0 ? (
            <WalkthroughTab projectId={projectId} recordings={g.recordings} />
          ) : null}
          {g.reports.length > 0 ? <ReportTab reports={g.reports} /> : null}
          {g.pairs.length === 0 && g.recordings.length === 0 && g.reports.length === 0 ? (
            <span className="text-[11px] text-(--text-secondary)">
              Evidence filed, but nothing viewable here.
            </span>
          ) : null}
        </section>
      ))}
      <ComparisonOverlay
        pairs={allPairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        // Story-aggregated evidence spans features on different branches, so there
        // is no one base/head sha — the overlay uses these only for caption chips.
        baseSha={undefined}
        headSha={undefined}
        projectId={projectId}
      />
    </div>
  )
}
