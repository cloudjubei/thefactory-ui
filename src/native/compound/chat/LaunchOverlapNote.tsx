import { Text, View } from 'react-native'

import type { LaunchOverlapView } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type LaunchOverlapNoteProps = {
  /** What other work touches the files the features name, from the launch preview. */
  view: LaunchOverlapView
}

/**
 * Other work touches the files this launch's features name — a live run, or
 * the base branch's new commits. A warning beside the launch, never a block.
 * Web peer: `web/compound/chat/LaunchOverlapNote`.
 */
export default function LaunchOverlapNote({ view }: LaunchOverlapNoteProps) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={view.heading}
      style={{
        gap: 4,
        borderWidth: 1,
        borderColor: status.review.softBorder,
        backgroundColor: status.review.softBg,
        borderRadius: nativeRadii[2],
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
        {view.heading}
      </Text>
      {view.lines.map((line) => (
        <Text key={line} style={{ fontSize: 11.5, color: status.review.softFg }}>
          {line}
        </Text>
      ))}
    </View>
  )
}
