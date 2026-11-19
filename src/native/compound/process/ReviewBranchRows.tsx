import { useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { diffLineKinds } from '../../../headless/utils/colleagueReviewBranchUpdates'
import { REVIEW_PUSH_COPY as COPY } from '../../../headless/utils/colleagueReviewBranchUpdatesConstants'
import type { ColleagueReviewBranchRow } from '../../../headless/utils/colleagueReviewBranchUpdatesTypes'
import { nativeFontFamilies, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ToneBadge from '../chips/ToneBadge'

function BranchRow({ row, diffOpen }: { row: ColleagueReviewBranchRow; diffOpen: boolean }) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(diffOpen)
  const mono = { fontFamily: nativeFontFamilies.mono, fontSize: 11.5 }
  const lineColor = {
    add: status.done.softFg,
    del: status.stuck.softFg,
    hunk: theme.text.muted,
    ctx: theme.text.secondary,
  }
  return (
    <View
      style={{
        gap: 6,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.raised,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text
          accessibilityRole="link"
          onPress={() => void Linking.openURL(row.url)}
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: theme.text.primary,
            textDecorationLine: 'underline',
          }}
        >
          {row.name}
        </Text>
        <ToneBadge tone={row.tone} label={row.stateLabel} />
        {row.checksPassed !== undefined ? (
          <ToneBadge
            tone={row.checksPassed ? 'done' : 'stuck'}
            label={row.checksPassed ? COPY.checksPassed : COPY.checksFailed}
          />
        ) : null}
      </View>
      {row.branches ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.branches}</Text>
      ) : null}
      {row.detail ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{row.detail}</Text>
      ) : null}
      {row.files.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: theme.text.muted }}>
            {COPY.files}
          </Text>
          <Text style={[mono, { color: theme.text.primary }]}>{row.files.join(', ')}</Text>
        </View>
      ) : null}
      {row.diffStat ? (
        <ScrollView horizontal>
          <Text style={[mono, { color: theme.text.secondary }]}>{row.diffStat}</Text>
        </ScrollView>
      ) : null}
      {row.checks.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {row.checks.map((check) => (
            <ToneBadge
              key={check.label}
              tone={check.passed ? 'done' : 'stuck'}
              label={`${check.label}: ${check.summary}`}
            />
          ))}
        </View>
      ) : null}
      {row.diff ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)}>
            <Text
              style={{ fontSize: 12, color: theme.text.secondary, textDecorationLine: 'underline' }}
            >
              {open ? COPY.hideDiff : COPY.showDiff}
            </Text>
          </Pressable>
          {open ? (
            <ScrollView
              horizontal
              style={{
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: nativeRadii[2],
                backgroundColor: theme.surface.muted,
                padding: 6,
              }}
            >
              <View>
                {diffLineKinds(row.diff).map((line, i) => (
                  <Text key={i} style={[mono, { color: lineColor[line.kind] }]}>
                    {line.text || ' '}
                  </Text>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

export type ReviewBranchRowsProps = {
  rows: readonly ColleagueReviewBranchRow[]
  /** Start with every diff open — for a fixed showcase state. */
  diffOpen?: boolean
}

/** Native peer of web's `ReviewBranchRows`: each pull request of a review run's push approval. */
export default function ReviewBranchRows({ rows, diffOpen = false }: ReviewBranchRowsProps) {
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <BranchRow key={row.url} row={row} diffOpen={diffOpen} />
      ))}
    </View>
  )
}
