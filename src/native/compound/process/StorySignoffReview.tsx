import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import {
  groupEvidence,
  screenPairs,
  useReviewEvidence,
  useStories,
  type EvidenceTile,
  type ScreenPair,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { ComparisonOverlay, ReportTab, ScreensTab, WalkthroughTab } from '../chat/signoff'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
}

const featureOfTile = (t: EvidenceTile): string => t.ref.featureId ?? ''

/**
 * The evidence the WHOLE story produced, gathered for its single sign-off — the
 * native peer of the web `StorySignoffReview`. Grouping is PER FEATURE (subjects
 * would otherwise collide across features) and each feature's pair keys are
 * namespaced by featureId so they stay unique across the one ComparisonOverlay.
 */
export default function StorySignoffReview({ projectId, storyId }: StorySignoffReviewProps) {
  const { theme } = useNativeTheme()
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
      ...[...byFeature.keys()].filter((id) => !features.some((f) => f.id === id)),
    ]
    return ordered.map((id) => {
      const tiles = byFeature.get(id) ?? []
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
        reports: tiles.filter((t) => t.ref.kind === 'report' || t.ref.kind === 'log'),
      }
    })
  }, [features, evidence.tiles])

  const allPairs = useMemo(() => groups.flatMap((g) => g.pairs), [groups])

  if (evidence.loading && evidence.tiles.length === 0) {
    return <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading the evidence…</Text>
  }
  if (evidence.tiles.length === 0) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        No evidence was filed for this story’s features.
      </Text>
    )
  }

  return (
    <View style={{ flexDirection: 'column', gap: 12 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        Evidence for the whole story
      </Text>
      {groups.map((g) => (
        <View
          key={g.id || 'unattributed'}
          style={{
            flexDirection: 'column',
            gap: 6,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            padding: 10,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
            {g.title}
          </Text>
          {g.pairs.length > 0 ? (
            <ScreensTab
              pairs={g.pairs}
              onOpen={setOpenPairKey}
              capturedLabel={undefined}
              capturing={false}
            />
          ) : null}
          {g.recordings.length > 0 ? <WalkthroughTab recordings={g.recordings} /> : null}
          {g.reports.length > 0 ? <ReportTab reports={g.reports} /> : null}
          {g.pairs.length === 0 && g.recordings.length === 0 && g.reports.length === 0 ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              Evidence filed, but nothing viewable here.
            </Text>
          ) : null}
        </View>
      ))}
      <ComparisonOverlay
        pairs={allPairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={undefined}
        headSha={undefined}
        projectId={projectId}
      />
    </View>
  )
}
