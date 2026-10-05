import { Text, View } from 'react-native'

import {
  PROOF_PLAN_SIGNOFF_HEADING,
  type ProofPlanMarkRow,
  type StoryStepTone,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck } from '../../icons/IconCheck'
import { IconXCircle } from '../../icons/IconXCircle'

function KindMark({ tone, color }: { tone: StoryStepTone; color: string }) {
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

export type ProofPlanMarksProps = {
  rows: readonly ProofPlanMarkRow[]
}

/**
 * A feature's proof plan on its sign-off: each kind it asked for, met or not,
 * and why. Web peer: `web/compound/process/ProofPlanMarks`.
 */
export default function ProofPlanMarks({ rows }: ProofPlanMarksProps) {
  const { theme, status } = useNativeTheme()
  const colorOf = (tone: StoryStepTone): string =>
    tone === 'neutral' ? theme.text.secondary : status[tone].softFg
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {PROOF_PLAN_SIGNOFF_HEADING}
      </Text>
      {rows.map((row) => (
        <View
          key={row.kind}
          accessible
          accessibilityLabel={`${row.label}: ${row.word}. ${row.detail}`}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
        >
          <View style={{ width: 14, height: 16, alignItems: 'center', justifyContent: 'center' }}>
            <KindMark tone={row.tone} color={colorOf(row.tone)} />
          </View>
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }} numberOfLines={3}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>{row.label}</Text>
            {'  '}
            <Text style={{ fontWeight: '500', color: colorOf(row.tone) }}>{row.word}</Text>
            {`  ${row.detail}`}
          </Text>
        </View>
      ))}
    </View>
  )
}
