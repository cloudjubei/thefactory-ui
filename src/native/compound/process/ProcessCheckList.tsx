import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  PROCESS_CHECK_ADVISORY_LABEL,
  processCheckRows,
  processCheckWaitingView,
  siblingFallbackCheckSets,
  siblingFallbackView,
  useDurationTimer,
  type ProcessLedgerEntry,
  type ProcessStep,
  type SiblingFallbackCheckSetId,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import SegmentedControl from '../../primitives/SegmentedControl'
import SiblingFallbackNotice from './SiblingFallbackNotice'

export type ProcessCheckListProps = {
  step: Pick<ProcessStep, 'kind'>
  latest: Pick<ProcessLedgerEntry, 'checks' | 'status' | 'queued' | 'siblingFallback'> | undefined
  /** A fixed clock for the waiting time; omitted ⇒ it ticks every second while the step waits. */
  now?: number
}

/**
 * Native peer of the web `ProcessCheckList`: under a checks step's node, each
 * command its newest attempt ran, how it came out, whether it was only
 * advisory, where it ran (sandbox or host, with the reason read aloud), the code
 * outside the checkout it built against, whether its failure already fails at
 * the change's base, and how long it took. While the step waits its turn behind
 * another check run of the project, that wait and how long it has lasted. An
 * attempt that ran again with out-of-tree code at its stable branch leads with
 * that notice and switches between its two runs. Nothing for any other step.
 */
export default function ProcessCheckList({ step, latest, now }: ProcessCheckListProps) {
  const { theme, status } = useNativeTheme()
  const waitingNow = latest?.status === 'running' && latest.queued !== undefined
  const ticking = useDurationTimer(waitingNow && now === undefined)
  const waiting = processCheckWaitingView({ step, ...(latest ? { latest } : {}) }, now ?? ticking)
  const sets = step.kind === 'check' ? siblingFallbackCheckSets(latest) : []
  const [shown, setShown] = useState<SiblingFallbackCheckSetId | undefined>(undefined)
  const set = sets.find((s) => s.id === shown) ?? sets[0]
  const rows = processCheckRows({
    step,
    ...(set ? { latest: { checks: set.checks } } : latest ? { latest } : {}),
  })
  const fallback =
    step.kind === 'check' && !waiting && latest?.siblingFallback
      ? latest.siblingFallback
      : undefined
  if (waiting) {
    return (
      <View
        accessibilityLabel={`${waiting.reason}, ${waiting.waited}`}
        style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 4, minWidth: 0 }}
      >
        <Text style={{ flexShrink: 1, fontSize: 12, color: status.queued.softFg }}>
          {waiting.reason}
        </Text>
        <Text
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: theme.text.muted,
            fontVariant: ['tabular-nums'],
          }}
        >
          {waiting.waited}
        </Text>
      </View>
    )
  }
  if (rows.length === 0 && !fallback) return null
  const list = (
    <View style={{ gap: 2, paddingTop: 4 }}>
      {rows.map((row) => {
        const fg = status[row.tone].softFg
        return (
          <View
            key={row.id}
            accessibilityLabel={[
              row.label,
              row.word,
              row.testCountLabel,
              row.advisory ? PROCESS_CHECK_ADVISORY_LABEL : undefined,
              row.ranInDetail,
              row.dependencyDetail,
              row.baselineDetail,
              row.durationLabel,
            ]
              .filter(Boolean)
              .join(', ')}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              columnGap: 6,
              rowGap: 2,
              minWidth: 0,
              paddingLeft: 18,
            }}
          >
            <Text
              style={{
                marginLeft: -18,
                width: 12,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '600',
                color: fg,
              }}
            >
              {row.mark}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
              {row.label}
            </Text>
            <Text style={{ fontSize: 12, color: fg }}>{row.word}</Text>
            {row.testCountLabel ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                {`— ${row.testCountLabel}`}
              </Text>
            ) : null}
            {row.advisory ? (
              <View
                style={{
                  borderColor: theme.border.strong,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ fontSize: 10, color: theme.text.secondary }}>
                  {PROCESS_CHECK_ADVISORY_LABEL}
                </Text>
              </View>
            ) : null}
            {row.ranInLabel ? (
              <View
                style={{
                  borderColor: theme.border.strong,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ fontSize: 10, color: theme.text.secondary }}>{row.ranInLabel}</Text>
              </View>
            ) : null}
            {row.baselineLabel ? (
              <View
                style={{
                  borderColor: theme.border.strong,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ fontSize: 10, color: theme.text.secondary }}>
                  {row.baselineLabel}
                </Text>
              </View>
            ) : null}
            {row.flaky ? (
              <View
                accessibilityLabel={row.flaky.detail}
                style={{
                  borderColor: status.on_hold.softBorder,
                  backgroundColor: status.on_hold.softBg,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ fontSize: 10, color: status.on_hold.softFg }}>
                  {row.flaky.label}
                </Text>
              </View>
            ) : null}
            {row.status !== 'passed' && row.summary ? (
              <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
                {row.summary}
              </Text>
            ) : null}
            <View style={{ flex: 1 }} />
            {row.durationLabel ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.durationLabel}</Text>
            ) : null}
            {row.dependencyDetail ? (
              <Text style={{ width: '100%', fontSize: 11, color: theme.text.muted }}>
                {row.dependencyDetail}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
  if (!fallback) return list
  return (
    <View style={{ gap: 6, paddingTop: 4 }}>
      <SiblingFallbackNotice view={siblingFallbackView(fallback)} />
      {sets.length > 0 && set ? (
        <SegmentedControl
          size="sm"
          options={sets.map((s) => ({ value: s.id, label: s.label }))}
          value={set.id}
          onChange={(v) => setShown(v as SiblingFallbackCheckSetId)}
        />
      ) : null}
      {rows.length > 0 ? list : null}
    </View>
  )
}
