import { type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'

import {
  AGENT_UNREACHABLE,
  aggregateTestCounts,
  checkActionOffer,
  handoffRequest,
  parseTestFailures,
  reviewCheckMeta,
  testTotalsHeadline,
  type TestFailure,
  type TestSuitesView,
  type CheckActionHost,
  type CheckMethodId,
  type CheckMethodRow,
  type ReviewCheckRow,
} from '../../../../headless'
import { nativeFontFamilies, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import CheckChip from '../../chips/CheckChip'
import HandoffButton from '../../chips/HandoffButton'
import RunActionButton from '../../chips/RunActionButton'
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
}

const OUTPUT_MAX_HEIGHT = 132

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

/**
 * The command output, always visible. The 132px cap IS the containment — hiding
 * it behind a toggle meant the one thing a reviewer opens this tab to read was
 * the one thing they had to go looking for.
 */
function Output({ text, stream }: { text: string; stream: 'stdout' | 'stderr' }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {stream}
      </Text>
      <ScrollView
        nestedScrollEnabled
        style={{
          maxHeight: OUTPUT_MAX_HEIGHT,
          borderRadius: nativeRadii[1],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.overlay,
        }}
        contentContainerStyle={{ padding: 8 }}
      >
        <Text
          selectable
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: 11,
            lineHeight: 17,
            color: theme.text.secondary,
          }}
        >
          {text}
        </Text>
      </ScrollView>
    </View>
  )
}

/** A failing test, laid out so the assertion is readable without opening a log. */
function Failure({ path, name, message }: TestFailure) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: 2,
        padding: 8,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: status.stuck.softBorder,
        backgroundColor: status.stuck.softBg,
      }}
    >
      {path ? (
        <Text
          style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11, color: theme.text.muted }}
        >
          {path}
        </Text>
      ) : null}
      {name ? (
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>{name}</Text>
      ) : null}
      {message ? (
        <Text
          selectable
          style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11, color: status.stuck.softFg }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  )
}

/** Each suite the run executed — module, name, counts, time — with its failing tests under it. */
function SuiteList({ suites }: { suites: TestSuitesView }) {
  const { theme, status } = useNativeTheme()
  const markColor = {
    passed: status.done.softFg,
    failed: status.stuck.softFg,
    skipped: theme.text.muted,
  }
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        Suites
      </Text>
      <View
        style={{
          borderRadius: nativeRadii[1],
          borderWidth: 1,
          borderColor: theme.border.subtle,
        }}
      >
        {suites.rows.map((suite, index) => (
          <View
            key={suite.key}
            style={{
              gap: 6,
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}
            >
              <Text style={{ fontSize: 12, color: markColor[suite.outcome] }}>{suite.mark}</Text>
              {suite.module ? (
                <Text
                  style={{
                    fontFamily: nativeFontFamilies.mono,
                    fontSize: 11,
                    color: theme.text.muted,
                  }}
                >
                  {suite.module}
                </Text>
              ) : null}
              <Text
                selectable
                style={{
                  flexShrink: 1,
                  fontFamily: nativeFontFamilies.mono,
                  fontSize: 11.5,
                  color: theme.text.primary,
                }}
              >
                {suite.name}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>{suite.countsLabel}</Text>
              {suite.durationLabel ? (
                <Text style={{ fontSize: 11, color: theme.text.muted }}>{suite.durationLabel}</Text>
              ) : null}
            </View>
            {suite.failures.map((f, i) => (
              <Failure key={`${f.name}-${i}`} {...f} />
            ))}
          </View>
        ))}
      </View>
      {suites.omittedLabel ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{suites.omittedLabel}</Text>
      ) : null}
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
  failed,
  summary,
  durationLabel,
  output,
  failures,
  suites,
  legacyNote,
  coverageNote,
  branch,
  busy,
  actions,
}: {
  row: CheckMethodRow
  title: ReactNode
  command: string | undefined
  /** The variant it ran on and why, the modules, the tests it counted, where it ran. */
  meta: string | undefined
  failed: boolean
  summary: string
  durationLabel: string | undefined
  output: string | undefined
  failures: readonly TestFailure[]
  /** Each suite it ran, when its reports were read — listed above the output tail. */
  suites: TestSuitesView | undefined
  /** Why the record cannot say what ran — it predates commands and output being kept. */
  legacyNote: string | undefined
  /** What the run could not cover, and why. */
  coverageNote: string | undefined
  branch: string | undefined
  busy: boolean
  actions: CheckActionHost | undefined
}) {
  const { theme } = useNativeTheme()
  const offer = checkActionOffer(row.action, actions)

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

      {suites ? (
        <>
          <SuiteList suites={suites} />
          {output ? <Output text={output} stream={failed ? 'stderr' : 'stdout'} /> : null}
        </>
      ) : failures.length > 0 ? (
        <View style={{ gap: 6 }}>
          {failures.map((f, i) => (
            <Failure key={`${f.path}-${f.name}-${i}`} {...f} />
          ))}
        </View>
      ) : output ? (
        <Output text={output} stream={failed ? 'stderr' : 'stdout'} />
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
          {offer.kind === 'request' && actions ? (
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
 * One block per method — the same block for Build and for Tests — with the
 * method's chip, its command, its time in the standard duration pill, its
 * output behind a toggle (capped and scrollable, so a long log cannot inflate
 * the row), and the one action its state allows.
 */
export default function ChecksTab({
  methods,
  checks,
  branch,
  busyId,
  actions,
  emptyState,
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
        {setup.kind === 'request' && actions ? (
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
  const testsRow = methods.length === 1 && methods[0]?.id === 'tests' ? methods[0] : undefined
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
        ? layers.map((layer) => (
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
              meta={reviewCheckMeta(layer)}
              failed={layer.status !== 'passed' && layer.status !== 'skipped'}
              summary={layer.summary}
              durationLabel={layer.durationLabel}
              output={layer.details}
              failures={layer.status === 'passed' ? [] : parseTestFailures(layer.details)}
              suites={layer.suites}
              legacyNote={layer.legacyNote}
              coverageNote={layer.coverageNote}
              branch={branch}
              busy={busyId === testsRow.id}
              actions={actions}
            />
          ))
        : methods.map((row) => {
            const mine = checks.filter((c) => row.checkIds.includes(c.id))
            return (
              <CheckBlock
                key={row.id}
                row={row}
                title={<CheckChip row={row} inert />}
                command={mine.length === 1 ? (mine[0].command ?? mine[0].label) : undefined}
                meta={mine.length === 1 ? reviewCheckMeta(mine[0]) : undefined}
                failed={row.state === 'failed'}
                summary={row.detail}
                durationLabel={row.durationLabel}
                output={row.output}
                failures={row.state === 'failed' ? parseTestFailures(row.output) : []}
                suites={mine.length === 1 ? mine[0].suites : undefined}
                legacyNote={mine.length === 1 ? mine[0].legacyNote : undefined}
                coverageNote={mine.length === 1 ? mine[0].coverageNote : undefined}
                branch={branch}
                busy={busyId === row.id}
                actions={actions}
              />
            )
          })}
    </View>
  )
}
