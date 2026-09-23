import { useState } from 'react'

import {
  aggregateTestCounts,
  reviewTabs,
  screenPairFileStem,
  verificationCheckRows,
  type CheckMethodId,
  type CheckMethodRow,
  type EvidenceTile,
  type FeatureSignoff,
  type RunReviewFacts,
  type ReviewTabId,
  type ScreenPair,
  type SignoffAgent,
} from '../../../headless'
import { IconCheck, IconXCircle } from '../../icons'
import { IconChevronRight } from '../../icons'
import {
  ChecksTab,
  CheckChipRow,
  DurCostChips,
  IdChip,
  ReportTab,
  ReviewTabBar,
  RunModelChip,
  ScreensTab,
  WalkthroughTab,
} from '../chat/signoff'
import { saveSideBySide } from '../chat/signoff/download'

/** The right-of-header line: a verify verdict ("Verify passed") toned by state. */
export type ReviewStatusLine = { tone: 'done' | 'review' | 'stuck'; label: string }

export type FeatureReviewSectionProps = {
  projectId: string
  /** An overall (story-wide) section is always open; a feature is collapsible. */
  kind: 'overall' | 'feature'
  /** The feature id label, e.g. "Feature #1.2" — feature sections only. */
  idLabel?: string
  title: string
  facts: RunReviewFacts
  agents: readonly SignoffAgent[]
  rows: readonly CheckMethodRow[]
  /** The verification behind the Tests/Build panes (merged, for overall). */
  verification: FeatureSignoff['verification']
  statusLine: ReviewStatusLine
  pairs: readonly ScreenPair[]
  recordings: readonly EvidenceTile[]
  reports: readonly EvidenceTile[]
  /** Feature sections start open only for the newest; overall ignores it. */
  defaultOpen?: boolean
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  /** Replaces the overall section's OVERALL badge — a verify attempt names itself. */
  badge?: { label: string; tone: ReviewStatusLine['tone'] }
  /** The reviewer's own conclusion, shown above the evidence it rests on. */
  verdictNote?: { label: string; reason?: string; tone: ReviewStatusLine['tone'] }
  /** What to say when nothing was filed, in place of the section's default. */
  emptyLabel?: string
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

const noop = () => {}

/** "Run by" + a read-only model chip per agent that ran the section. */
function AgentRow({ agents }: { agents: readonly SignoffAgent[] }) {
  if (agents.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        Run by
      </span>
      {agents.map((a) => (
        <RunModelChip key={a.role} model={a.model} role={a.role} />
      ))}
    </div>
  )
}

const BADGE_TONE: Record<ReviewStatusLine['tone'], string> = {
  done: 'badge--done',
  review: 'badge--review',
  stuck: 'badge--stuck',
}

const NOTE_TONE: Record<ReviewStatusLine['tone'], string> = {
  done: 'border-(--status-done-soft-border) bg-(--status-done-soft-bg) text-(--status-done-soft-fg)',
  review:
    'border-(--status-review-soft-border) bg-(--status-review-soft-bg) text-(--status-review-soft-fg)',
  stuck:
    'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) text-(--status-stuck-soft-fg)',
}

const STATUS_TONE: Record<ReviewStatusLine['tone'], string> = {
  done: 'text-(--status-done-soft-fg)',
  review: 'text-(--status-review-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
}

/**
 * The mark matches the tone: a check only for what passed, a cross for what
 * failed, and a hollow dot for what nobody concluded — a check beside "Verify
 * failed" read as the opposite of what it said.
 */
function StatusVline({ line }: { line: ReviewStatusLine }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] ${STATUS_TONE[line.tone]}`}>
      {line.tone === 'done' ? (
        <IconCheck className="size-3.5" />
      ) : line.tone === 'stuck' ? (
        <IconXCircle className="size-3.5" />
      ) : (
        <span aria-hidden className="size-2 rounded-full border-[1.5px] border-current" />
      )}
      <span className="font-medium">{line.label}</span>
    </span>
  )
}

/**
 * One section of the story sign-off — the story-wide "Overall" or a single
 * feature — in the settled design: a header (scope chip / OVERALL badge, title,
 * a verify line, its own duration + cost chips), then its body (which agents ran
 * it, the read-only capability chips, and the evidence behind per-capability
 * tabs). A feature is collapsible so the digest leads and evidence is on demand;
 * the overall is always open as the summary above them.
 *
 * READ-ONLY: sign-off decisions and running/requesting a check happen in the
 * feature's own chat. Nothing here runs anything; a chip only ever OPENS its
 * proof. There is no Changes tab — a per-feature diff is not loaded at story
 * scope; it is read in the feature's chat panel.
 */
export default function FeatureReviewSection({
  projectId,
  kind,
  idLabel,
  title,
  facts,
  agents,
  rows,
  verification,
  statusLine,
  pairs,
  recordings,
  reports,
  defaultOpen,
  onOpenPair,
  onRequestImage,
  badge,
  verdictNote,
  emptyLabel,
}: FeatureReviewSectionProps) {
  const [activeTab, setActiveTab] = useState<ReviewTabId | undefined>()

  const checkRows = verificationCheckRows(verification)
  const testChecks = checkRows.filter((c) => c.kind === 'tests')
  const buildChecks = checkRows.filter((c) => c.kind !== 'tests')
  const testTotals = aggregateTestCounts(testChecks.map((c) => c.summary))

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

  // A passed chip opens its proof; if that proof has no tab here (a read diff),
  // do nothing rather than select a pane that does not exist.
  const openProof = (tab: ReviewTabId) => {
    if (tabs.some((t) => t.id === tab)) setActiveTab(tab)
  }

  const savePair = (pair: ScreenPair) =>
    void saveSideBySide(
      pair.before?.dataUri,
      pair.after?.dataUri,
      `${screenPairFileStem(pair)}-before-after.png`,
    )
  const saveAll = () => {
    for (const pair of pairs) savePair(pair)
  }

  const body = (
    <div className="flex flex-col gap-2.5 px-3 pb-3 pt-2.5">
      {verdictNote ? (
        <div
          className={`flex flex-col gap-0.5 rounded-md border px-2.5 py-2 ${NOTE_TONE[verdictNote.tone]}`}
        >
          <span className="text-[12px] font-semibold">Reviewer · {verdictNote.label}</span>
          {verdictNote.reason ? (
            <p className="m-0 max-w-[72ch] text-[12px]">{verdictNote.reason}</p>
          ) : null}
        </div>
      ) : null}

      <AgentRow agents={agents} />

      {rows.length > 0 ? (
        <CheckChipRow
          rows={[...rows]}
          branch={undefined}
          busyId={undefined}
          canRequest={false}
          onOpenProof={openProof}
          onRun={noop}
          onRequest={noop}
        />
      ) : null}

      {tabs.length > 0 && currentTab ? (
        <div className="flex flex-col gap-2.5 rounded-lg border border-(--border-subtle) bg-(--surface-base)">
          <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
          <div className="px-3 pb-3">
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
        </div>
      ) : (
        <span className="text-[11px] text-(--text-secondary)">
          {emptyLabel ??
            (kind === 'overall'
              ? 'No story-wide evidence was filed.'
              : 'No screens, walkthroughs or reports were filed for this feature.')}
        </span>
      )}
    </div>
  )

  if (kind === 'overall') {
    return (
      <div className="overflow-hidden rounded-lg border border-(--accent-primary)/40 bg-(--surface-overlay)">
        <div className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2.5">
          <span className={`badge badge--soft ${BADGE_TONE[badge?.tone ?? 'done']} badge--sm`}>
            {badge?.label ?? 'OVERALL'}
          </span>
          <span className="text-[13.5px] font-semibold text-(--text-primary)">{title}</span>
          <span className="ml-auto flex items-center gap-2">
            <StatusVline line={statusLine} />
            <DurCostChips facts={facts} />
          </span>
        </div>
        {body}
      </div>
    )
  }

  return (
    <details
      className="group overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-overlay)"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex list-none flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2.5 [&::-webkit-details-marker]:hidden cursor-pointer">
        {idLabel ? <IdChip kind="feature">{idLabel}</IdChip> : null}
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-(--text-primary)">
          {title}
        </span>
        <StatusVline line={statusLine} />
        <DurCostChips facts={facts} />
        <IconChevronRight className="size-3.5 shrink-0 text-(--text-muted) transition-transform group-open:rotate-90" />
      </summary>
      {body}
    </details>
  )
}
