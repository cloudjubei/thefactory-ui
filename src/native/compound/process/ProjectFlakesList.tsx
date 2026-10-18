import { Text, View } from 'react-native'

import { PROJECT_FLAKES_HEADING, projectFlakeRows } from '../../../headless'
import type { ProjectCheckKnownFlake } from '../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProjectFlakesListProps = {
  /** The project's known flaky tests, from its checks. */
  flakes: readonly ProjectCheckKnownFlake[]
  /** A fixed clock for "last seen"; omitted ⇒ now. */
  now?: number
}

/**
 * The project's known flaky tests, the most recently seen first: the test, its
 * file, how many runs it was seen in, when last, and the fix filed. Nothing
 * when there are none. Web peer: `web/compound/process/ProjectFlakesList`.
 */
export default function ProjectFlakesList({ flakes, now }: ProjectFlakesListProps) {
  const { theme, status } = useNativeTheme()
  const rows = projectFlakeRows(flakes, now ?? Date.now())
  if (rows.length === 0) return null
  return (
    <View
      accessibilityLabel={PROJECT_FLAKES_HEADING}
      style={{
        gap: 6,
        padding: nativeSpace[2],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {PROJECT_FLAKES_HEADING}
      </Text>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}
          >
            {row.test}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.secondary }}>
            {row.file}
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {row.seen} · {row.lastSeen}
          </Text>
          {row.fix ? (
            <Text style={{ fontSize: 11, color: status.review.softFg }}>{row.fix}</Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}
