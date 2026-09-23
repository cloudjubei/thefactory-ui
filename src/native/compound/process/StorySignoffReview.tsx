import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import {
  groupEvidence,
  screenPairs,
  useReviewEvidence,
  useStories,
  useStorySignoff,
  type EvidenceTile,
  type OverallSignoff,
  type ProcessParkChoice,
  type ProcessResumeChoice,
  type ScreenPair,
  type SignoffVerdict,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { IconCheck } from '../../icons/IconCheck'
import { IconShield } from '../../icons/IconShield'
import {
  ComparisonOverlay,
  DurCostChips,
  IdChip,
  VerdictBadge,
  type SaveFileHandler,
} from '../chat/signoff'
import FeatureReviewSection, { type ReviewStatusLine } from './FeatureReviewSection'

export type StorySignoffReviewProps = {
  projectId: string
  storyId: string
  /** The gate's decision choices — the panel's decide bar acts on the whole story. */
  choices?: readonly ProcessParkChoice[]
  onChoose?: (choice: ProcessResumeChoice) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
}

const featureOfTile = (t: EvidenceTile): string => t.ref.featureId ?? ''

const VERDICT_TONE: Record<SignoffVerdict['key'], 'done' | 'review' | 'stuck'> = {
  proven: 'done',
  partly: 'review',
  failed: 'stuck',
  'not-run': 'review',
}

function featureStatusLine(verdict: SignoffVerdict): ReviewStatusLine {
  switch (verdict.key) {
    case 'proven':
      return { tone: 'done', label: 'Verify passed' }
    case 'failed':
      return { tone: 'stuck', label: 'Verify failed' }
    case 'partly':
      return { tone: 'review', label: 'Partly verified' }
    default:
      return { tone: 'review', label: 'Not verified' }
  }
}

type EvBucket = { pairs: ScreenPair[]; recordings: EvidenceTile[]; reports: EvidenceTile[] }

/**
 * The whole-story sign-off — the native peer of the web `StorySignoffReview`. One
 * panel: a head naming the story with its total time + cost, a verdict, a toned
 * digest, then the story-wide Overall section and each feature (newest first,
 * collapsible), each with which agents ran it and its evidence behind capability
 * tabs — closing on one decide bar that acts on the WHOLE story.
 */
export default function StorySignoffReview({
  projectId,
  storyId,
  choices,
  onChoose,
  onSaveFile,
}: StorySignoffReviewProps) {
  const { theme, status } = useNativeTheme()
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
        // Only true reports — a `log` is raw tool output, not the verifier's
        // account; stacking both turned the sign-off into a wall.
        reports: tiles.filter((t) => t.ref.kind === 'report'),
      })
    }
    return m
  }, [evidence.tiles])

  const emptyBucket: EvBucket = useMemo(() => ({ pairs: [], recordings: [], reports: [] }), [])
  const overallBucket = bucketByFeature.get('') ?? emptyBucket

  const runBacked = new Set(signoff.features.map((f) => f.featureId))
  const evidenceOnly = [...features]
    .reverse()
    .filter((f) => !runBacked.has(f.id) && bucketByFeature.has(f.id))
  const featureIndex = (id: string): number => features.findIndex((f) => f.id === id) + 1

  const allPairs = useMemo(
    () => [...bucketByFeature.values()].flatMap((b) => b.pairs),
    [bucketByFeature],
  )
  const hasSignoff = signoff.features.length > 0 || signoff.overall !== undefined

  if (evidence.loading && evidence.tiles.length === 0 && !hasSignoff) {
    return <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading the evidence…</Text>
  }
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
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            Verdict — the whole story
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <VerdictBadge verdict={verdict} />
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary, flexShrink: 1 }}
            >
              {verdict.title}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{verdict.detail}</Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: status[tone].softBorder,
            backgroundColor: status[tone].softBg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconCheck size={15} color={status[tone].softFg} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: status[tone].softFg }}>
              {signoff.digest.headline}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{signoff.digest.line}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <IconShield size={14} color={theme.text.muted} />
          <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.muted }}>
            Each feature was signed off by the review process — nothing gets through unverified.
            Expand one to inspect its evidence.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {signoff.overall ? (
            <OverallSection
              overall={signoff.overall}
              bucket={overallBucket}
              onOpenPair={setOpenPairKey}
              onRequestImage={evidence.requestImage}
              onSaveFile={onSaveFile}
            />
          ) : null}

          {signoff.features.map((f, i) => {
            const bucket = bucketByFeature.get(f.featureId) ?? emptyBucket
            return (
              <FeatureReviewSection
                key={f.featureId}
                kind="feature"
                idLabel={`Feature #${featureIndex(f.featureId)}`}
                title={f.title}
                facts={f.facts}
                agents={f.agents}
                rows={f.rows}
                verification={f.verification}
                statusLine={featureStatusLine(f.verdict)}
                pairs={bucket.pairs}
                recordings={bucket.recordings}
                reports={bucket.reports}
                defaultOpen={i === 0}
                onOpenPair={setOpenPairKey}
                onRequestImage={evidence.requestImage}
                onSaveFile={onSaveFile}
              />
            )
          })}

          {evidenceOnly.map((f) => {
            const bucket = bucketByFeature.get(f.id) ?? emptyBucket
            return (
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
                pairs={bucket.pairs}
                recordings={bucket.recordings}
                reports={bucket.reports}
                onOpenPair={setOpenPairKey}
                onRequestImage={evidence.requestImage}
                onSaveFile={onSaveFile}
              />
            )
          })}
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
          {choices.map((c) => (
            <Button
              key={c.choice}
              size="sm"
              variant={c.primary ? 'primary' : c.choice === 'reject' ? 'ghost' : 'secondary'}
              onPress={() => onChoose(c.choice)}
            >
              {c.label}
            </Button>
          ))}
        </View>
      ) : null}

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

function OverallSection({
  overall,
  bucket,
  onOpenPair,
  onRequestImage,
  onSaveFile,
}: {
  overall: OverallSignoff
  bucket: EvBucket
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
      statusLine={
        overall.allGreen
          ? { tone: 'done', label: 'All green' }
          : { tone: 'stuck', label: 'Checks failed' }
      }
      pairs={[]}
      recordings={bucket.recordings}
      reports={bucket.reports}
      onOpenPair={onOpenPair}
      onRequestImage={onRequestImage}
      onSaveFile={onSaveFile}
    />
  )
}
