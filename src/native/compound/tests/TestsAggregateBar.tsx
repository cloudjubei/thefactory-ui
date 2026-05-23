import { Text, View } from 'react-native'
import { msToShort } from '../../../headless/utils/testsFormat'
import type { TestsResultLike } from './types'

export type TestsAggregateBarProps = {
  results: TestsResultLike | null
  /** Override the headline. Defaults to "All tests passed" / "Test run completed with failures". */
  title?: string
  /** Optional message rendered to the right of the counts (e.g. "Last run 2m ago"). */
  trailingNote?: string
}

/**
 * Native peer of `web/compound/tests/TestsAggregateBar`. Renders the
 * pass/fail/skip summary as a compact red/green status banner.
 */
export function TestsAggregateBar({ results, title, trailingNote }: TestsAggregateBarProps) {
  if (!results) return null
  const summary = results.summary
  const failed = summary?.failed ?? 0
  const hasFailures = failed > 0
  const dur = msToShort(summary?.durationMs)
  const headline = title ?? (hasFailures ? 'Test run completed with failures' : 'All tests passed')

  // Light-mode parity with web's red-50 / green-50 status banners. Borders
  // stay subtle on each side; we don't try to mimic dark-mode automatically
  // here because the rest of mobile reads from `--surface-*` CSS variables.
  const border = hasFailures ? '#fecaca' : '#bbf7d0'
  const background = hasFailures ? '#fef2f2' : '#f0fdf4'
  const headlineColor = hasFailures ? '#b91c1c' : '#15803d'
  const countPassColor = '#15803d'
  const countFailColor = '#b91c1c'
  const countSkipColor = '#b45309'
  const mutedColor = '#525252'

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: border,
        backgroundColor: background,
        borderRadius: 6,
        padding: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: headlineColor }}>{headline}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12, color: countPassColor }}>{`✓ ${summary.passed}`}</Text>
        <Text style={{ fontSize: 12, color: countFailColor }}>{`✗ ${summary.failed}`}</Text>
        <Text style={{ fontSize: 12, color: countSkipColor }}>{`○ ${summary.skipped}`}</Text>
        <Text style={{ fontSize: 12, color: mutedColor }}>{`• ${summary.total} total`}</Text>
        {dur ? <Text style={{ fontSize: 12, color: mutedColor }}>{`• ${dur}`}</Text> : null}
        {trailingNote ? (
          <Text style={{ fontSize: 12, color: mutedColor, marginLeft: 'auto' }}>
            {trailingNote}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

export default TestsAggregateBar
