import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { parseUnifiedDiff } from 'thefactory-tools/utils'
import type { GitDiffLineType } from 'thefactory-tools/types'
import { nativeLightTheme, nativePalette, nativeSpace } from '../../../tokens/native'

export interface UnifiedDiffProps {
  /** Unified-diff patch body. */
  patch?: string
  /** When true, renders a "binary file" placeholder instead of the diff. */
  binary?: boolean
  /** Max height before the diff body scrolls vertically. Default 360. */
  maxHeight?: number
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
export default function UnifiedDiff({ patch, binary, maxHeight = 360 }: UnifiedDiffProps) {
  const hunks = useMemo(() => (patch ? (parseUnifiedDiff(patch) ?? []) : []), [patch])

  if (binary) {
    return <Placeholder text="Binary file — diff not shown" />
  }
  if (!patch || hunks.length === 0) {
    return <Placeholder text="No changes to display." />
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
