import { Text, View } from 'react-native'

import {
  PROCESS_CHECK_ADVISORY_LABEL,
  processCheckRows,
  type ProcessLedgerEntry,
  type ProcessStep,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessCheckListProps = {
  step: Pick<ProcessStep, 'kind'>
  latest: Pick<ProcessLedgerEntry, 'checks'> | undefined
}

/**
 * Native peer of the web `ProcessCheckList`: under a checks step's node, each
 * command its newest attempt ran, how it came out, whether it was only
 * advisory, where it ran (sandbox or host, the reason read aloud), and how long
 * it took. Nothing for any other step.
 */
export default function ProcessCheckList({ step, latest }: ProcessCheckListProps) {
  const { theme, status } = useNativeTheme()
  const rows = processCheckRows({ step, ...(latest ? { latest } : {}) })
  if (rows.length === 0) return null
  return (
    <View style={{ gap: 2, paddingTop: 4 }}>
      {rows.map((row) => {
        const fg = status[row.tone].softFg
        return (
          <View
            key={row.id}
            accessibilityLabel={[
              row.label,
              row.word,
              row.advisory ? PROCESS_CHECK_ADVISORY_LABEL : undefined,
              row.ranInDetail,
              row.durationLabel,
            ]
              .filter(Boolean)
              .join(', ')}
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, minWidth: 0 }}
          >
            <Text
              style={{ width: 12, textAlign: 'center', fontSize: 12, fontWeight: '600', color: fg }}
            >
              {row.mark}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
              {row.label}
            </Text>
            <Text style={{ fontSize: 12, color: fg }}>{row.word}</Text>
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
            {row.status !== 'passed' && row.summary ? (
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}
              >
                {row.summary}
              </Text>
            ) : null}
            <View style={{ flex: 1 }} />
            {row.durationLabel ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.durationLabel}</Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
