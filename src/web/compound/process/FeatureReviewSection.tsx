import { useState } from 'react'

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
import {
  ChecksTab,
  CheckChipRow,
  ReportTab,
  ReviewTabBar,
  RunModelChip,
  ScreensTab,
  VerdictBadge,
  WalkthroughTab,
} from '../chat/signoff'
import { saveSideBySide } from '../chat/signoff/download'

export type FeatureReviewSectionProps = {
  projectId: string
  title: string
  /** The feature's verdict + checks + facts, when a run produced them. */
  signoff: FeatureSignoff | undefined
  pairs: readonly ScreenPair[]
  recordings: readonly EvidenceTile[]
  reports: readonly EvidenceTile[]
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

const noop = () => {}

/** Cost + duration, together, as the trailing fact of the header row. */
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

/**
 * One feature's slice of the story sign-off: its verdict, the "what was checked"
 * chips, and the evidence behind capability tabs — the same tab model as the
 * single-run panel, but READ-ONLY. Sign-off decisions and running/requesting a
 * check happen in the feature's own chat, so nothing here runs anything; a chip
 * only ever OPENS its proof. There is no Changes tab: a per-feature diff is not
 * loaded at story scope, and the branch is read in the feature's chat panel.
 */
export default function FeatureReviewSection({
  projectId,
  title,
  signoff,
  pairs,
  recordings,
  reports,
  onOpenPair,
  onRequestImage,
}: FeatureReviewSectionProps) {
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
    // No per-feature diff at story scope — the Changes tab lives in the feature chat.
    changedFiles: undefined,
  })
  const currentTab: ReviewTabId | undefined =
    activeTab && tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id

  // A passed chip opens its proof; if that proof has no tab here (a read diff),
  // do nothing rather than select a pane that does not exist.
  const openProof = (tab: ReviewTabId) => {
    if (tabs.some((t) => t.id === tab)) setActiveTab(tab)
  }

  // A pair as one side-by-side sheet — the pair is the unit of evidence, so two
  // separate files would hand the reader the job of reassembling it.
  const savePair = (pair: ScreenPair) =>
    void saveSideBySide(
      pair.before?.dataUri,
      pair.after?.dataUri,
      `${screenPairFileStem(pair)}-before-after.png`,
    )
  const saveAll = () => {
    for (const pair of pairs) savePair(pair)
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="m-0 text-[12.5px] font-semibold text-(--text-primary)">{title}</h4>
        {signoff ? <VerdictBadge verdict={signoff.verdict} /> : null}
        {signoff?.runModel ? <RunModelChip model={signoff.runModel} /> : null}
        <span className="flex-1" />
        {signoff ? (
          <Facts costLabel={signoff.facts.costLabel} durationLabel={signoff.facts.durationLabel} />
        ) : null}
      </div>

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
        <div className="flex flex-col gap-2.5">
          <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
          {currentTab === 'screens' ? (
            <ScreensTab
              pairs={pairs}
              onOpen={onOpenPair}
              capturedLabel={undefined}
              onSaveAll={pairs.length > 0 ? saveAll : undefined}
              onSavePair={savePair}
              onRequestImage={onRequestImage}
              capturing={false}
            />
          ) : currentTab === 'walkthrough' ? (
            <WalkthroughTab projectId={projectId} recordings={recordings} />
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
            <ReportTab reports={reports} />
          ) : null}
        </div>
      ) : (
        <span className="text-[11px] text-(--text-secondary)">
          {signoff
            ? 'No screens, walkthroughs or reports were filed for this feature.'
            : 'Evidence filed, but nothing viewable here.'}
        </span>
      )}
    </section>
  )
}
