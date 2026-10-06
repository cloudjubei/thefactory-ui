import { type ReactNode } from 'react'
import { Text, View } from 'react-native'

import {
  AGENT_UNREACHABLE,
  aggregateTestCounts,
  capabilitySetupOffered,
  checkActionOffer,
  handoffRequest,
  ranCheckMethods,
  reviewCheckMeta,
  testLayerLines,
  testTotalsHeadline,
  TERMINAL_RAW_OUTPUT_LABEL,
  type CheckActionHost,
  type CheckMethodId,
  type CheckMethodRow,
  type CheckTestResults,
  type ReviewCheckRow,
} from '../../../../headless'
import { nativeFontFamilies, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import CheckChip from '../../chips/CheckChip'
import HandoffButton from '../../chips/HandoffButton'
import RunActionButton from '../../chips/RunActionButton'
import SetUpWithAgentButton from '../../chips/SetUpWithAgentButton'
import { TerminalOutput } from '../../TerminalOutput'
import { TestResultsList } from '../../tests/TestResultsList'
import DurationPill from './DurationPill'
import { toneText } from './tones'

export type ChecksTabProps = {
  /** The method rows this tab owns (tests, or the build-side methods). */
  methods: readonly CheckMethodRow[]
  /** Every individual check that rolled up into those methods. */
  checks: readonly ReviewCheckRow[]
  branch: string | undefined
  busyId: CheckMethodId | undefined
  /** What this panel can do about a check; absent on a read-only record, which offers no control. */
  actions?: CheckActionHost
  /** Shown when the tab owns no method with anything to say — e.g. no tests at all. */
  emptyState?: { title: string; body: string }
  /** Opens a chat drafted to set a missing capability up, in place of the hand-off. */
  onSetUp?: (row: CheckMethodRow) => void
}

function Card({ children, padding = 10 }: { children: ReactNode; padding?: number }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 8,
        padding,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      {children}
    </View>
  )
}

/** A plain note about the record itself — what it cannot show, or what the run could not cover. */
function RecordNote({ text }: { text: string }) {
  const { status } = useNativeTheme()
  return (
    <Text
      style={{
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: status.review.softBorder,
        backgroundColor: status.review.softBg,
        fontSize: 11.5,
        color: status.review.softFg,
      }}
    >
      {text}
    </Text>
  )
}

function CheckBlock({
  row,
  title,
  command,
  meta,
  summary,
  durationLabel,
  output,
  testResults,
  legacyNote,
  coverageNote,
  branch,
  busy,
  actions,
  onSetUp,
}: {
  row: CheckMethodRow
  title: ReactNode
  command: string | undefined
  /** The variant it ran on and why, the modules, the tests it counted, where it ran. */
  meta: string | undefined
  summary: string
  durationLabel: string | undefined
  output: string | undefined
  /** Its test run, drawn by the Tests display above its raw output, which stays folded. */
  testResults: CheckTestResults | undefined
  /** Why the record cannot say what ran — it predates commands and output being kept. */
  legacyNote: string | undefined
  /** What the run could not cover, and why. */
  coverageNote: string | undefined
  branch: string | undefined
  busy: boolean
  actions: CheckActionHost | undefined
  onSetUp: ((row: CheckMethodRow) => void) | undefined
}) {
  const { theme } = useNativeTheme()
  const offer = checkActionOffer(row.action, actions)
  const setUp = onSetUp && capabilitySetupOffered(row) ? onSetUp : undefined

  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {title}
        {command ? (
          <Text
            style={{
              flexShrink: 1,
              fontFamily: nativeFontFamilies.mono,
              fontSize: 11,
              color: theme.text.secondary,
            }}
          >
            {command}
          </Text>
        ) : (
          <Text style={{ flexShrink: 1, fontSize: 11, color: theme.text.muted }}>{summary}</Text>
        )}
        <View style={{ flex: 1 }} />
        {durationLabel ? <DurationPill label={durationLabel} /> : null}
      </View>

      {command && summary ? (
        <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{summary}</Text>
      ) : null}

      {meta ? <Text style={{ fontSize: 11, color: theme.text.muted }}>{meta}</Text> : null}

      {legacyNote ? <RecordNote text={legacyNote} /> : null}
      {coverageNote ? <RecordNote text={coverageNote} /> : null}

      {testResults ? (
        <>
          {testResults.unrecordedNote ? <RecordNote text={testResults.unrecordedNote} /> : null}
          {testResults.results ? <TestResultsList results={testResults.results} inline /> : null}
          {testResults.omittedLabel ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              {testResults.omittedLabel}
            </Text>
          ) : null}
          {output ? (
            <TerminalOutput text={output} label={TERMINAL_RAW_OUTPUT_LABEL} collapsed />
          ) : null}
        </>
      ) : output ? (
        <TerminalOutput text={output} />
      ) : null}

      {/* The action is the card's LAST element, always, on its own line — see
          the web peer for why a wrapping row moved the button with the length
          of the prose beside it. */}
      {row.action.kind === 'run' ? (
        <View style={{ alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {`Nothing was captured for ${row.noun}.`}
          </Text>
          {offer.kind === 'run' && actions ? (
            <RunActionButton busy={busy} onPress={() => actions.onRun(row)}>
              Run it now
            </RunActionButton>
          ) : null}
        </View>
      ) : row.action.kind === 'request' && (row.action.purpose === 'setup' || actions) ? (
        <View style={{ alignItems: 'flex-start', gap: 8 }}>
          {row.action.purpose === 'setup' ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {`${row.detail} Setting it up is a code change, so it is work for the agent.`}
            </Text>
          ) : null}
          {setUp ? (
            <SetUpWithAgentButton onPress={() => setUp(row)} />
          ) : offer.kind === 'request' && actions ? (
            <>
              {offer.unreachable ? (
                <Text style={{ fontSize: 11, color: theme.text.muted }}>{AGENT_UNREACHABLE}</Text>
              ) : null}
              <HandoffButton
                disabled={busy || offer.unreachable}
                onPress={() => actions.onRequest(row, offer.purpose)}
              >
                {handoffRequest(row, offer.purpose, { branch }).buttonLabel}
              </HandoffButton>
            </>
          ) : null}
        </View>
      ) : null}
    </Card>
  )
}

/**
 * One block per method that ran — what did not is the chips' to say — the same
 * block for Build and for Tests, with the method's chip, its command, its time
 * in the standard duration pill, its tests through the Tests display, its output
 * in the terminal block, and the one action its state allows.
 */
export default function ChecksTab({
  methods,
  checks,
  branch,
  busyId,
  actions,
  emptyState,
  onSetUp,
}: ChecksTabProps) {
  const { theme, status } = useNativeTheme()
  const allUnconfigured = methods.length > 0 && methods.every((m) => m.state === 'unconfigured')
  if (emptyState && allUnconfigured) {
    const first = methods[0]
    const setup = checkActionOffer(
      { kind: 'request', purpose: 'setup', approachId: undefined },
      actions,
    )
    return (
      <Card padding={12}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {emptyState.title}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{emptyState.body}</Text>
        {onSetUp && first && capabilitySetupOffered(first) ? (
          <View style={{ alignItems: 'flex-start' }}>
            <SetUpWithAgentButton onPress={() => onSetUp(first)} />
          </View>
        ) : setup.kind === 'request' && actions ? (
          <View style={{ alignItems: 'flex-start', gap: 6 }}>
            <HandoffButton
              disabled={setup.unreachable}
              onPress={() => actions.onRequest(first, 'setup')}
            >
              {handoffRequest(first, 'setup', { branch }).buttonLabel}
            </HandoffButton>
            {setup.unreachable ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{AGENT_UNREACHABLE}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    )
  }
  const ran = ranCheckMethods(methods)
  const testsRow = ran.length === 1 && ran[0]?.id === 'tests' ? ran[0] : undefined
  const layers = testsRow ? checks.filter((c) => testsRow.checkIds.includes(c.id)) : []
  const totals = testsRow ? aggregateTestCounts(layers) : undefined
  const anyFailed = layers.some((l) => l.status === 'failed' || l.status === 'error')
  const headline = totals ? testTotalsHeadline(totals, anyFailed) : undefined
  const agg =
    headline?.outcome === 'failed'
      ? status.stuck
      : headline?.outcome === 'none'
        ? status.review
        : status.done

  return (
    <View style={{ gap: 8 }}>
      {totals && headline ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: agg.softBorder,
            backgroundColor: agg.softBg,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: agg.softFg }}>
            {headline.title}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 12, color: agg.softFg }}>{`✓ ${totals.passed}`}</Text>
          <Text style={{ fontSize: 12, color: agg.softFg }}>{`✗ ${totals.failed}`}</Text>
          <Text style={{ fontSize: 12, color: agg.softFg }}>{`○ ${totals.skipped}`}</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {`• ${totals.total} across ${layers.length} ${layers.length === 1 ? 'layer' : 'layers'}`}
          </Text>
        </View>
      ) : null}

      {testsRow && layers.length > 0
        ? layers.map((layer) => {
            const lines = testLayerLines(layer, layers.length)
            return (
              <CheckBlock
                key={layer.id}
                row={testsRow}
                title={
                  <Text
                    style={{ fontSize: 12, fontWeight: '600', color: toneText(layer.tone, theme) }}
                  >
                    {layer.label}
                  </Text>
                }
                command={layer.command}
                meta={lines.meta}
                summary={lines.summary ?? ''}
                durationLabel={layer.durationLabel}
                output={layer.details}
                testResults={layer.testResults}
                legacyNote={layer.legacyNote}
                coverageNote={layer.coverageNote}
                branch={branch}
                busy={busyId === testsRow.id}
                actions={actions}
                onSetUp={onSetUp}
              />
            )
          })
        : ran.map((row) => {
            const mine = checks.filter((c) => row.checkIds.includes(c.id))
            return (
              <CheckBlock
                key={row.id}
                row={row}
                title={<CheckChip row={row} inert />}
                command={mine.length === 1 ? (mine[0].command ?? mine[0].label) : undefined}
                meta={mine.length === 1 ? reviewCheckMeta(mine[0]) : undefined}
                summary={row.detail}
                durationLabel={row.durationLabel}
                output={row.output}
                testResults={mine.length === 1 ? mine[0].testResults : undefined}
                legacyNote={mine.length === 1 ? mine[0].legacyNote : undefined}
                coverageNote={mine.length === 1 ? mine[0].coverageNote : undefined}
                branch={branch}
                busy={busyId === row.id}
                actions={actions}
                onSetUp={onSetUp}
              />
            )
          })}
    </View>
  )
}
