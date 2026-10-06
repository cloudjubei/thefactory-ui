import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View, type TextStyle } from 'react-native'

import {
  TERMINAL_BACKGROUND,
  TERMINAL_BORDER,
  TERMINAL_DIM_OPACITY,
  TERMINAL_FOREGROUND,
  TERMINAL_MAX_HEIGHT,
  TERMINAL_OUTPUT_LABEL,
  TERMINAL_PALETTE,
  terminalOutputView,
  type TerminalSpan,
} from '../../headless'
import { nativeFontFamilies, nativeRadii } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight } from '../icons'

export type TerminalOutputProps = {
  text: string
  /** The heading above the block — "Output" when omitted. */
  label?: string
  /** Folds the block behind its heading, starting closed. */
  collapsed?: boolean
}

function spanStyle(span: TerminalSpan): TextStyle | undefined {
  if (!span.color && !span.bold && !span.dim) return undefined
  return {
    ...(span.color ? { color: TERMINAL_PALETTE[span.color] } : {}),
    ...(span.bold ? { fontWeight: '600' as const } : {}),
    ...(span.dim ? { opacity: TERMINAL_DIM_OPACITY } : {}),
  }
}

/**
 * Native peer of `web/compound/TerminalOutput`: command output dark in both
 * themes, monospace, its colour codes drawn as colour and every other escape
 * sequence dropped, scrolling inside its own container. The text is selectable.
 */
export function TerminalOutput({ text, label, collapsed = false }: TerminalOutputProps) {
  const { theme } = useNativeTheme()
  const view = useMemo(() => terminalOutputView(text), [text])
  const [open, setOpen] = useState(!collapsed)
  if (view.lines.length === 0) return null
  const heading = label ?? TERMINAL_OUTPUT_LABEL
  const headingStyle: TextStyle = {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.text.muted,
  }
  return (
    <View style={{ gap: 4 }}>
      {collapsed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          {open ? (
            <IconChevronDown size={12} color={theme.text.muted} />
          ) : (
            <IconChevronRight size={12} color={theme.text.muted} />
          )}
          <Text style={headingStyle}>{heading}</Text>
        </Pressable>
      ) : (
        <Text style={headingStyle}>{heading}</Text>
      )}
      {open ? (
        <ScrollView
          nestedScrollEnabled
          style={{
            maxHeight: TERMINAL_MAX_HEIGHT,
            borderRadius: nativeRadii[1],
            borderWidth: 1,
            borderColor: TERMINAL_BORDER,
            backgroundColor: TERMINAL_BACKGROUND,
          }}
          contentContainerStyle={{ padding: 10 }}
        >
          <Text
            selectable
            style={{
              fontFamily: nativeFontFamilies.mono,
              fontSize: 11,
              lineHeight: 17,
              color: TERMINAL_FOREGROUND,
            }}
          >
            {view.lines.map((spans, i) => (
              <Text key={i}>
                {i > 0 ? '\n' : null}
                {spans.map((span, j) => (
                  <Text key={j} style={spanStyle(span)}>
                    {span.text}
                  </Text>
                ))}
              </Text>
            ))}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  )
}

export default TerminalOutput
