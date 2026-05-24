import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { parseUnifiedDiff } from 'thefactory-tools/utils'
import type { GitDiffLineType } from 'thefactory-tools/types'
import { nativeLightTheme, nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface UnifiedDiffProps {
  /** Unified-diff patch body. */
  patch?: string
  /** When true, renders a "binary file" placeholder instead of the diff. */
  binary?: boolean
  /** Max height before the diff body scrolls vertically. Default 360. */
  maxHeight?: number
  /**
   * Above this many renderable lines the diff is gated behind a "Show
   * anyway" button — rendering a huge unified diff blocks the JS thread
   * long enough to feel like a freeze. Mirrors web's
   * `StructuredUnifiedDiff` `largeGuardLines` (default 5000).
   */
  largeGuardLines?: number
}

const LINE_BG: Record<GitDiffLineType, string> = {
  add: 'rgba(22,163,74,0.12)',
  del: 'rgba(220,38,38,0.12)',
  context: 'transparent',
}
const LINE_FG: Record<GitDiffLineType, string> = {
  add: nativePalette.green[700],
  del: nativePalette.red[700],
  context: nativeLightTheme.text.secondary,
}
const GUTTER: Record<GitDiffLineType, string> = { add: '+', del: '-', context: ' ' }

/**
 * Native peer of web's `StructuredUnifiedDiff` — a read-only unified-diff
 * renderer. Parsing is shared with the backend + web via
 * `thefactory-tools/utils` `parseUnifiedDiff`; this component only renders.
 * No intraline word-diff (web-only refinement); each line is tinted by type
 * with a +/− gutter, inside a horizontal scroller so long lines don't wrap.
 */
export default function UnifiedDiff({
  patch,
  binary,
  maxHeight = 360,
  largeGuardLines = 5000,
}: UnifiedDiffProps) {
  const hunks = useMemo(() => (patch ? (parseUnifiedDiff(patch) ?? []) : []), [patch])
  const totalRenderableLines = useMemo(
    () => hunks.reduce((acc, h) => acc + h.lines.filter((l) => l.type !== 'context' || l.text !== undefined).length, 0),
    [hunks],
  )
  // Initial bypass is per-mount: navigating to a new diff resets the gate.
  const [guardBypass, setGuardBypass] = useState(false)

  if (binary) {
    return <Placeholder text="Binary file — diff not shown" />
  }
  if (!patch || hunks.length === 0) {
    return <Placeholder text="No changes to display." />
  }
  if (!guardBypass && totalRenderableLines > largeGuardLines) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: nativeLightTheme.border.subtle,
          borderRadius: 6,
          padding: nativeSpace[4],
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.primary }}>
          Diff is very large ({totalRenderableLines} lines). Showing it might freeze the UI.
        </Text>
        <Pressable
          onPress={() => setGuardBypass(true)}
          accessibilityRole="button"
          accessibilityLabel="Show large diff anyway"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: nativeLightTheme.border.subtle,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[2],
            backgroundColor: pressed
              ? nativeLightTheme.surface.hover
              : nativeLightTheme.surface.muted,
          })}
        >
          <Text style={{ fontSize: 12, color: nativeLightTheme.text.primary }}>
            Show anyway
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <ScrollView style={{ maxHeight }} nestedScrollEnabled>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {hunks.map((hunk, hi) => (
              <View key={`h-${hi}`}>
                <View
                  style={{
                    backgroundColor: nativeLightTheme.surface.muted,
                    paddingHorizontal: nativeSpace[2],
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Menlo',
                      fontSize: 11,
                      color: nativePalette.blue[700],
                    }}
                  >
                    @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@{' '}
                    {hunk.header ?? ''}
                  </Text>
                </View>
                {hunk.lines.map((line, li) => (
                  <View
                    key={`l-${hi}-${li}`}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: LINE_BG[line.type],
                    }}
                  >
                    <Text
                      style={{
                        width: 40,
                        textAlign: 'right',
                        paddingRight: 6,
                        fontFamily: 'Menlo',
                        fontSize: 11,
                        color: nativeLightTheme.text.muted,
                      }}
                    >
                      {line.oldLine ?? ''}
                    </Text>
                    <Text
                      style={{
                        width: 40,
                        textAlign: 'right',
                        paddingRight: 6,
                        fontFamily: 'Menlo',
                        fontSize: 11,
                        color: nativeLightTheme.text.muted,
                      }}
                    >
                      {line.newLine ?? ''}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Menlo',
                        fontSize: 11,
                        color: LINE_FG[line.type],
                        paddingHorizontal: 4,
                      }}
                    >
                      {GUTTER[line.type]}
                      {line.text}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
        borderRadius: 6,
        padding: nativeSpace[4],
      }}
    >
      <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>{text}</Text>
    </View>
  )
}
