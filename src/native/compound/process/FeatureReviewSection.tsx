import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  aggregateTestCounts,
  proofScreensPane,
  reviewTabOrder,
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
  type StoryStepLine,
  type StoryStepTone,
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
import ProofBanner from './ProofBanner'
import ProofScreens from './ProofScreens'

/** The right-of-header line: a verify verdict ("Verify passed") toned by state. */
export type ReviewStatusLine = { tone: 'done' | 'review' | 'stuck'; label: string }

export type FeatureReviewSectionProps = {
  kind: 'overall' | 'feature'
  idLabel?: string
  /** The id chip's scope tint — a story-level section (a fix pass) is the story's blue. */
  idScope?: 'story' | 'feature'
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
  /** The code review's finding — its own tab, never the Report tab. */
  codeReviews?: readonly EvidenceTile[]
  /** The tab the section opens on when it is there — the story's final report. */
  leadTab?: ReviewTabId
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
  /** Replaces the overall section's OVERALL badge — a verify attempt names itself. */
  badge?: { label: string; tone: ReviewStatusLine['tone'] }
  /** A person's acceptance or the gate's conclusion, then the reviewer's — above the evidence. */
  notes?: readonly VerifyVerdictNote[]
  /** The overall's one-glance summary: how each of the story run's own steps came out. */
  steps?: readonly StoryStepLine[]
  /** What to say when nothing was filed, in place of the section's default. */
  emptyLabel?: string
  /**
   * The verify gate's own judgement. When present it leads the section with the
   * data it ran on, and the Screens tab shows exactly its pairs — never `pairs`.
   */
  proof?: VerifyProofView
  /** Which verify attempt the section shows, and why it is that one. */
  attemptLabel?: string
}

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

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

/** The mark beside a step's line — see {@link StatusVline}; a written report takes a quiet dot. */
function StepMark({ tone, color }: { tone: StoryStepTone; color: string }) {
  if (tone === 'done') return <IconCheck size={14} color={color} />
  if (tone === 'stuck') return <IconXCircle size={14} color={color} />
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        ...(tone === 'neutral'
          ? { backgroundColor: color }
          : { borderWidth: 1.5, borderColor: color }),
      }}
    />
  )
}

/** One line per story step, quiet by design — the web peer's `StepSummary`. */
function StepSummary({ steps }: { steps: readonly StoryStepLine[] }) {
  const { theme, status } = useNativeTheme()
  const colorOf = (tone: StoryStepTone): string =>
    tone === 'neutral' ? theme.text.secondary : status[tone].softFg
  return (
    <View style={{ gap: 4 }}>
      {steps.map((step) => (
        <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ width: 14, height: 16, alignItems: 'center', justifyContent: 'center' }}>
            <StepMark tone={step.tone} color={colorOf(step.tone)} />
          </View>
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }} numberOfLines={2}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>{step.name}</Text>
            {'  '}
            <Text style={{ fontWeight: '500', color: colorOf(step.tone) }}>{step.word}</Text>
            {step.line ? `  ${step.line}` : ''}
          </Text>
        </View>
      ))}
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
  idScope = 'feature',
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
  codeReviews = [],
  leadTab,
  onOpenPair,
  onRequestImage,
  onSaveFile,
  badge,
  notes = [],
  steps = [],
  emptyLabel,
  proof,
  attemptLabel,
}: FeatureReviewSectionProps) {
  const { theme, status } = useNativeTheme()
  const [activeTab, setActiveTab] = useState<ReviewTabId | undefined>()
  const [open, setOpen] = useState<boolean>(kind === 'overall')

  const checkRows = verificationCheckRows(verification)
  const testChecks = checkRows.filter((c) => c.kind === 'tests')
  const buildChecks = checkRows.filter((c) => c.kind !== 'tests')
  const testTotals = aggregateTestCounts(testChecks.map((c) => c.summary))

  const tabs = reviewTabs({
    screens: proof ? proof.screens.length : pairs.length,
    ...(proof ? { screensProof: proofScreensPane(proof).thumbnails.length } : {}),
    walkthroughs: recordings.length + uncountedRecordings.length,
    reports: reports.length,
    testCount: testTotals?.total ?? 0,
    testChecks: testChecks.length,
    buildChecks: buildChecks.length,
    changedFiles: undefined,
    codeReviews: codeReviews.length,
    ...(leadTab ? { lead: leadTab } : {}),
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
        <IdChip kind={idScope}>{idLabel}</IdChip>
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

      {steps.length > 0 ? <StepSummary steps={steps} /> : null}

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
          tabOrder={reviewTabOrder(leadTab)}
          rows={[...rows]}
          branch={undefined}
          busyId={undefined}
          onOpenProof={openProof}
        />
      ) : null}

      {tabs.length > 0 && currentTab ? (
        <View style={{ gap: 10 }}>
          <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
          {currentTab === 'screens' && proof ? (
            <ProofScreens
              view={proof}
              onOpen={onOpenPair}
              onRequestImage={onRequestImage}
              onSavePair={onSaveFile ? savePair : undefined}
            />
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
            />
          ) : currentTab === 'build' ? (
            <ChecksTab
              methods={rows.filter((r) => BUILD_METHODS.includes(r.id))}
              checks={buildChecks}
              branch={undefined}
              busyId={undefined}
            />
          ) : currentTab === 'report' ? (
            <ReportTab reports={reports} onSaveFile={onSaveFile} />
          ) : currentTab === 'code-review' ? (
            <ReportTab reports={codeReviews} onSaveFile={onSaveFile} />
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
