import { Text, View } from 'react-native'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export type TestsProgressBarProps = {
  /** Heading shown to the left of the counts (e.g. "Unit tests running…"). */
  label: string
  /** Files processed so far. */
  completed: number
  /** Total files in this run, when known. Omit to render the count only. */
  total?: number | null
  /** Name of the file currently executing, when known. */
  currentFile?: string
}

/**
 * Native peer of `web/compound/tests/TestsProgressBar`. Renders a banner
 * while a test job is in flight; the bar disappears until the runner
 * reports `total` so we never show a misleading zero-progress sliver.
 */
export function TestsProgressBar({ label, completed, total, currentFile }: TestsProgressBarProps) {
  const pct =
    typeof total === 'number' && total > 0
      ? Math.min(100, Math.round((completed / total) * 100))
      : null

  return (
    <View
      style={{
        gap: nativeSpace[2],
        borderRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: nativeLightTheme.surface.raised,
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: nativeLightTheme.text.primary }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: 'Menlo',
            color: nativeLightTheme.text.muted,
          }}
        >
          {typeof total === 'number' ? `${completed} / ${total}` : `${completed} files`}
          {pct != null ? ` · ${pct}%` : ''}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={{ flex: 1, fontSize: 12, color: nativeLightTheme.text.muted }}
        >
          {currentFile ?? ''}
        </Text>
      </View>
      {pct != null ? (
        <View
          style={{
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: nativeLightTheme.surface.muted,
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: nativeLightTheme.accent.primary,
            }}
          />
        </View>
      ) : null}
    </View>
  )
}

export default TestsProgressBar
