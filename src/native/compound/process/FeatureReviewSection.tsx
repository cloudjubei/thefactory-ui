import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  aggregateTestCounts,
  reviewTabs,
  screenPairFileStem,
  verificationCheckRows,
  type CheckMethodId,
  type EvidenceTile,
  type FeatureSignoff,
  type ReviewTabId,
  type ScreenPair,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  ChecksTab,
  CheckChipRow,
  ReportTab,
  ReviewTabBar,
  RunModelChip,
  ScreensTab,
  VerdictBadge,
  WalkthroughTab,
  type SaveFileHandler,
} from '../chat/signoff'

export type FeatureReviewSectionProps = {
  title: string
  /** The feature's verdict + checks + facts, when a run produced them. */
  signoff: FeatureSignoff | undefined
  pairs: readonly ScreenPair[]
  recordings: readonly EvidenceTile[]
  reports: readonly EvidenceTile[]
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

const noop = () => {}

/** Cost + duration, together, as the trailing fact of the header row. */
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

/**
 * One feature's slice of the story sign-off — the native peer of the web
 * `FeatureReviewSection`. Its verdict, the "what was checked" chips, and the
 * evidence behind capability tabs, READ-ONLY: sign-off and running/requesting a
 * check happen in the feature's own chat, so a chip only ever opens its proof.
 * No Changes tab — a per-feature diff is not loaded at story scope.
 */
export default function FeatureReviewSection({
  title,
  signoff,
  pairs,
  recordings,
  reports,
  onOpenPair,
  onRequestImage,
  onSaveFile,
}: FeatureReviewSectionProps) {
  const { theme } = useNativeTheme()
  const [activeTab, setActiveTab] = useState<ReviewTabId | undefined>()

  const checkRows = verificationCheckRows(signoff?.verification)
  const testChecks = checkRows.filter((c) => c.kind === 'tests')
  const buildChecks = checkRows.filter((c) => c.kind !== 'tests')
  const testTotals = aggregateTestCounts(testChecks.map((c) => c.summary))
  const rows = signoff?.rows ?? []

  const tabs = reviewTabs({
    screens: pairs.length,
    walkthroughs: recordings.length,
    reports: reports.length,
    testCount: testTotals?.total ?? 0,
    testChecks: testChecks.length,
    buildChecks: buildChecks.length,
    changedFiles: undefined,
  })
  const currentTab: ReviewTabId | undefined =
    activeTab && tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id

  const openProof = (tab: ReviewTabId) => {
    if (tabs.some((t) => t.id === tab)) setActiveTab(tab)
  }

  // Native has no canvas to composite a side-by-side sheet, so a pair saves as
  // its two frames — the same as the comparison overlay's save.
  const savePair = (pair: ScreenPair) => {
    if (!onSaveFile) return
    const stem = screenPairFileStem(pair)
    if (pair.before?.dataUri)
      void onSaveFile({ name: `${stem}-before.png`, dataUri: pair.before.dataUri })
    if (pair.after?.dataUri)
      void onSaveFile({ name: `${stem}-after.png`, dataUri: pair.after.dataUri })
  }
  const saveAll = () => {
    for (const pair of pairs) savePair(pair)
  }

  return (
    <View
      style={{
        flexDirection: 'column',
        gap: 8,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
          {title}
        </Text>
        {signoff ? <VerdictBadge verdict={signoff.verdict} /> : null}
        {signoff?.runModel ? <RunModelChip model={signoff.runModel} /> : null}
        <View style={{ flex: 1 }} />
        {signoff ? (
          <Facts costLabel={signoff.facts.costLabel} durationLabel={signoff.facts.durationLabel} />
        ) : null}
      </View>

      {rows.length > 0 ? (
        <CheckChipRow
          rows={rows}
          branch={undefined}
          busyId={undefined}
          canRequest={false}
          onOpenProof={openProof}
          onRun={noop}
          onRequest={noop}
        />
      ) : null}

      {tabs.length > 0 && currentTab ? (
        <View style={{ gap: 10 }}>
          <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
          {currentTab === 'screens' ? (
            <ScreensTab
              pairs={pairs}
              onOpen={onOpenPair}
              capturedLabel={undefined}
              onSaveAll={onSaveFile && pairs.length > 0 ? saveAll : undefined}
              onSavePair={onSaveFile ? savePair : undefined}
              onRequestImage={onRequestImage}
              capturing={false}
            />
          ) : currentTab === 'walkthrough' ? (
            // Native cannot play or fetch a recording's bytes (no player, no
            // projectId here), so it names/sizes it rather than downloading it.
            <WalkthroughTab recordings={recordings} />
          ) : currentTab === 'tests' ? (
            <ChecksTab
              methods={rows.filter((r) => TEST_METHODS.includes(r.id))}
              checks={testChecks}
              branch={undefined}
              busyId={undefined}
              canRequest={false}
              onRun={noop}
              onRequest={noop}
            />
          ) : currentTab === 'build' ? (
            <ChecksTab
              methods={rows.filter((r) => BUILD_METHODS.includes(r.id))}
              checks={buildChecks}
              branch={undefined}
              busyId={undefined}
              canRequest={false}
              onRun={noop}
              onRequest={noop}
            />
          ) : currentTab === 'report' ? (
            <ReportTab reports={reports} onSaveFile={onSaveFile} />
          ) : null}
        </View>
      ) : (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>
          {signoff
            ? 'No screens, walkthroughs or reports were filed for this feature.'
            : 'Evidence filed, but nothing viewable here.'}
        </Text>
      )}
    </View>
  )
}
