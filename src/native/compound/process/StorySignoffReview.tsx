import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

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
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { ComparisonOverlay, VerdictBadge, type SaveFileHandler } from '../chat/signoff'
import FeatureReviewSection from './FeatureReviewSection'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
}

const featureOfTile = (t: EvidenceTile): string => t.ref.featureId ?? ''

/** Cost + duration, together, as the trailing fact of a header row. */
function Facts({ costLabel, durationLabel }: { costLabel?: string; durationLabel?: string }) {
  const { theme } = useNativeTheme()
  if (!costLabel && !durationLabel) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {durationLabel ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary, fontVariant: ['tabular-nums'] }}>
          {durationLabel}
        </Text>
      ) : null}
      {durationLabel && costLabel ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>·</Text>
      ) : null}
      {costLabel ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '500',
            color: theme.text.primary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {costLabel}
        </Text>
      ) : null}
    </View>
  )
}

/** The one-glance pass/fail summary — only the states that actually occurred. */
function DigestStrip({ digest }: { digest: StoryDigest }) {
  const { theme, status } = useNativeTheme()
  const all = [
    { key: 'failed', n: digest.failed, label: 'failed', bg: status.stuck.bg, fg: status.stuck.fg },
    {
      key: 'partly',
      n: digest.partly,
      label: 'partly',
      bg: status.review.bg,
      fg: status.review.fg,
    },
    {
      key: 'notRun',
      n: digest.notRun,
      label: 'not run',
      bg: theme.surface.muted,
      fg: theme.text.muted,
    },
    { key: 'proven', n: digest.proven, label: 'proven', bg: status.done.bg, fg: status.done.fg },
  ]
  const chips = all.filter((c) => c.n > 0)
  if (chips.length === 0) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {chips.map((c) => (
        <View
          key={c.key}
          style={{
            borderRadius: nativeRadii.round,
            paddingHorizontal: 8,
            paddingVertical: 2,
            backgroundColor: c.bg,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '500', color: c.fg }}>
            {c.n} {c.label}
          </Text>
        </View>
      ))}
    </View>
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
 * sign-off — the native peer of the web `StorySignoffReview`. The header carries
 * the aggregate verdict, a pass/fail digest and story-total cost/duration; each
 * feature is a section, NEWEST FIRST, with its own verdict, model and cost above
 * its evidence. Grouping is PER FEATURE (subjects would otherwise collide) and
 * pair keys are namespaced by featureId for the one ComparisonOverlay.
 */
export default function StorySignoffReview({
  projectId,
  storyId,
  onSaveFile,
}: StorySignoffReviewProps) {
  const { theme } = useNativeTheme()
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
    for (const f of signoff.features) {
      order.push(f.featureId)
      seen.add(f.featureId)
    }
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
    return order.map((id) => {
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
          (id ? 'Other evidence' : 'Unattributed evidence'),
        pairs,
        recordings: tiles.filter((t) => t.ref.kind === 'recording'),
        reports: tiles.filter((t) => t.ref.kind === 'report' || t.ref.kind === 'log'),
      }
    })
  }, [signoff.features, signoffByFeature, features, evByFeature])

  const allPairs = useMemo(() => sections.flatMap((s) => s.pairs), [sections])
  const hasSignoff = signoff.features.length > 0

  if (evidence.loading && evidence.tiles.length === 0 && !hasSignoff) {
    return <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading the evidence…</Text>
  }
  if (sections.length === 0) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        No evidence was filed for this story’s features.
      </Text>
    )
  }

  return (
    <View style={{ flexDirection: 'column', gap: 12 }}>
      {hasSignoff ? (
        <View style={{ flexDirection: 'column', gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <VerdictBadge verdict={signoff.verdict} />
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary, flexShrink: 1 }}
            >
              {signoff.verdict.title}
            </Text>
            <View style={{ flex: 1 }} />
            <Facts
              costLabel={signoff.facts.costLabel}
              durationLabel={signoff.facts.durationLabel}
            />
          </View>
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
            {signoff.verdict.detail}
          </Text>
          <DigestStrip digest={signoff.digest} />
        </View>
      ) : (
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
      )}
      {sections.map((s) => (
        <FeatureReviewSection
          key={s.id || 'unattributed'}
          title={s.title}
          signoff={s.signoff}
          pairs={s.pairs}
          recordings={s.recordings}
          reports={s.reports}
          onOpenPair={setOpenPairKey}
          onRequestImage={evidence.requestImage}
          onSaveFile={onSaveFile}
        />
      ))}
      <ComparisonOverlay
        pairs={allPairs}
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
