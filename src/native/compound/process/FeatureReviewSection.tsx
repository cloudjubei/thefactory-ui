import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

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
  type VerifyAttemptView,
  type VerifyProofView,
  type VerifyVerdictNote,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck } from '../../icons/IconCheck'
import { IconXCircle } from '../../icons/IconXCircle'
import { IconChevronRight } from '../../icons/IconChevronRight'
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
  type SaveFileHandler,
} from '../chat/signoff'
import OtherVerifyAttempts from './OtherVerifyAttempts'
import ProofBanner from './ProofBanner'
import ProofScreens from './ProofScreens'

/** The right-of-header line: a verify verdict ("Verify passed") toned by state. */
export type ReviewStatusLine = { tone: 'done' | 'review' | 'stuck'; label: string }

export type FeatureReviewSectionProps = {
  kind: 'overall' | 'feature'
  idLabel?: string
  title: string
  facts: RunReviewFacts
  agents: readonly SignoffAgent[]
  rows: readonly CheckMethodRow[]
  verification: FeatureSignoff['verification']
  statusLine: ReviewStatusLine
  pairs: readonly ScreenPair[]
  recordings: readonly EvidenceTile[]
  /** Recordings filed with a verify attempt that its gate did not count — shown apart, marked. */
  uncountedRecordings?: readonly EvidenceTile[]
  reports: readonly EvidenceTile[]
  defaultOpen?: boolean
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
  /** Replaces the overall section's OVERALL badge — a verify attempt names itself. */
  badge?: { label: string; tone: ReviewStatusLine['tone'] }
  /** A person's acceptance or the gate's conclusion, then the reviewer's — above the evidence. */
  notes?: readonly VerifyVerdictNote[]
  /** What to say when nothing was filed, in place of the section's default. */
  emptyLabel?: string
  /**
   * The verify gate's own judgement. When present it leads the section with the
   * data it ran on, and the Screens tab shows exactly its pairs — never `pairs`.
   */
  proof?: VerifyProofView
  /** Which verify attempt the section shows, and why it is that one. */
  attemptLabel?: string
  /** The verify attempts the section is not showing, folded away. */
  otherAttempts?: { label: string; attempts: readonly VerifyAttemptView[] }
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

const noop = () => {}

function AgentRow({ agents }: { agents: readonly SignoffAgent[] }) {
  const { theme } = useNativeTheme()
  if (agents.length === 0) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        Run by
      </Text>
      {agents.map((a) => (
        <RunModelChip key={a.role} model={a.model} role={a.role} />
      ))}
    </View>
  )
}

/** The mark matches the tone — see the web peer's `StatusVline`. */
function StatusVline({ line }: { line: ReviewStatusLine }) {
  const { status } = useNativeTheme()
  const color = status[line.tone].softFg
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {line.tone === 'done' ? (
        <IconCheck size={14} color={color} />
      ) : line.tone === 'stuck' ? (
        <IconXCircle size={14} color={color} />
      ) : (
        <View
          style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: color }}
        />
      )}
      <Text style={{ fontSize: 12.5, fontWeight: '500', color }}>{line.label}</Text>
    </View>
  )
}

/**
 * One section of the story sign-off — the story-wide "Overall" or a single
 * feature — the native peer of the web `FeatureReviewSection`. A header (scope
 * chip / OVERALL badge, title, verify line, its own duration + cost chips), then
 * its body (which agents ran it, the read-only capability chips, the evidence
 * behind per-capability tabs). A feature is collapsible; the overall is open.
 *
 * READ-ONLY: a chip only ever opens its proof. No Changes tab — a per-feature
 * diff is not loaded at story scope.
 */
export default function FeatureReviewSection({
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
  uncountedRecordings = [],
  reports,
  defaultOpen,
  onOpenPair,
  onRequestImage,
  onSaveFile,
  badge,
  notes = [],
  emptyLabel,
  proof,
  attemptLabel,
  otherAttempts,
}: FeatureReviewSectionProps) {
  const { theme, status } = useNativeTheme()
  const [activeTab, setActiveTab] = useState<ReviewTabId | undefined>()
  const [open, setOpen] = useState<boolean>(kind === 'overall' ? true : defaultOpen === true)

  const checkRows = verificationCheckRows(verification)
  const testChecks = checkRows.filter((c) => c.kind === 'tests')
  const buildChecks = checkRows.filter((c) => c.kind !== 'tests')
  const testTotals = aggregateTestCounts(testChecks.map((c) => c.summary))

  const tabs = reviewTabs({
    screens: proof ? proof.screens.length : pairs.length,
    walkthroughs: recordings.length + uncountedRecordings.length,
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

  const collapsible = kind === 'feature'
  const showBody = kind === 'overall' || open

  const header = (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: showBody ? 1 : 0,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      {kind === 'overall' ? (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: nativeRadii.round,
            backgroundColor: status[badge?.tone ?? 'done'].softBg,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.4,
              color: status[badge?.tone ?? 'done'].softFg,
            }}
          >
            {badge?.label ?? 'OVERALL'}
          </Text>
        </View>
      ) : idLabel ? (
        <IdChip kind="feature">{idLabel}</IdChip>
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13.5,
          fontWeight: '600',
          color: theme.text.primary,
        }}
      >
        {title}
      </Text>
      {proof?.header?.chip ? (
        <View
          accessibilityLabel={proof.header.title}
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: nativeRadii.round,
            backgroundColor: status[proof.header.tone].softBg,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.4,
              color: status[proof.header.tone].softFg,
            }}
          >
            {proof.header.chip}
          </Text>
        </View>
      ) : null}
      <StatusVline line={statusLine} />
      <DurCostChips facts={facts} />
      {collapsible ? (
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={14} color={theme.text.muted} />
        </View>
      ) : null}
    </View>
  )

  const body = (
    <View style={{ gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
      {attemptLabel ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{attemptLabel}</Text>
      ) : null}

      {proof?.header ? <ProofBanner header={proof.header} /> : null}

      {notes.map((note) => (
        <View
          key={note.label}
          style={{
            gap: 2,
            borderRadius: nativeRadii[1],
            borderWidth: 1,
            borderColor: status[note.tone].softBorder,
            backgroundColor: status[note.tone].softBg,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: status[note.tone].softFg }}>
            {note.label}
          </Text>
          {note.reason ? (
            <Text style={{ fontSize: 12, color: status[note.tone].softFg }}>{note.reason}</Text>
          ) : null}
          {note.details?.map((d) => (
            <Text key={d} style={{ fontSize: 12, color: status[note.tone].softFg }}>
              {`• ${d}`}
            </Text>
          ))}
        </View>
      ))}

      {proof && proof.screens.length === 0 ? (
        <Text
          style={{
            fontSize: 12.5,
            fontWeight: '600',
            color:
              proof.summary.tone === 'empty'
                ? theme.text.secondary
                : status[proof.summary.tone].softFg,
          }}
        >
          {proof.summary.text}
        </Text>
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
        <View style={{ gap: 10 }}>
          <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
          {currentTab === 'screens' && proof ? (
            <ProofScreens view={proof} onOpen={onOpenPair} onRequestImage={onRequestImage} />
          ) : currentTab === 'screens' ? (
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
            <View style={{ gap: 12 }}>
              {recordings.length > 0 ? <WalkthroughTab recordings={recordings} /> : null}
              {uncountedRecordings.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <View style={{ gap: 2 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        color: theme.text.muted,
                      }}
                    >
                      {`Did not count (${uncountedRecordings.length})`}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
                      Filed with this attempt, but the reviewer’s approval did not cover them.
                    </Text>
                  </View>
                  <View style={{ opacity: 0.75 }}>
                    <WalkthroughTab recordings={uncountedRecordings} />
                  </View>
                </View>
              ) : null}
            </View>
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
          {emptyLabel ??
            (kind === 'overall'
              ? 'No story-wide evidence was filed.'
              : 'No screens, walkthroughs or reports were filed for this feature.')}
        </Text>
      )}

      {otherAttempts && otherAttempts.attempts.length > 0 ? (
        <OtherVerifyAttempts
          label={otherAttempts.label}
          attempts={otherAttempts.attempts}
          onOpenPair={onOpenPair}
          onRequestImage={onRequestImage}
        />
      ) : null}
    </View>
  )

  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: kind === 'overall' ? theme.accent.primary : theme.border.subtle,
        backgroundColor: theme.surface.overlay,
        overflow: 'hidden',
      }}
    >
      {collapsible ? (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button">
          {header}
        </Pressable>
      ) : (
        header
      )}
      {showBody ? body : null}
    </View>
  )
}
