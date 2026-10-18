import { Text, View } from 'react-native'

import { mergeChecksView, siblingFallbackView, type MergeChecks } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CheckChip from '../chips/CheckChip'
import SiblingFallbackNotice from '../process/SiblingFallbackNotice'
import { TerminalOutput } from '../TerminalOutput'

export type MergeChecksResultProps = {
  checks: MergeChecks
}

/**
 * Native peer of web's `MergeChecksResult`: how a merge's result built and
 * type-checked before its branch moved — one line, whether it was checked
 * again with out-of-tree code at its stable branch, a chip per check that ran,
 * and what the failed ones printed.
 */
export default function MergeChecksResult({ checks }: MergeChecksResultProps) {
  const { theme, status } = useNativeTheme()
  const view = mergeChecksView(checks)
  const color = {
    passed: status.done.softFg,
    failed: status.stuck.softFg,
    skipped: theme.text.secondary,
  }[view.status]
  return (
    <View accessibilityLabel="Checks on the merged result" style={{ gap: nativeSpace[2] }}>
      <Text style={{ fontSize: 13, color }}>{view.summary}</Text>
      {checks.siblingFallback ? (
        <SiblingFallbackNotice view={siblingFallbackView(checks.siblingFallback)} hideMessage />
      ) : null}
      {view.chips.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {view.chips.map((row) => (
            <CheckChip key={row.id} row={row} inert />
          ))}
        </View>
      ) : null}
      {view.failingOutput ? <TerminalOutput text={view.failingOutput} /> : null}
    </View>
  )
}
