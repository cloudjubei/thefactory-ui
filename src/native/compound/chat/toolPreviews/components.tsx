import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View, type ViewStyle } from 'react-native'

import { toLines } from '../../../../headless/utils/toolPreview'
import { nativeFontFamilies, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

// Native peers of the web tool-preview building blocks
// (`web/compound/chat/toolPreviews/components.tsx`). The visual rhythm —
// font sizes, secondary text colour, monospace block layout — mirrors web
// so a JSON / diff / patch preview reads the same when a user switches
// between the two clients.

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme } = useNativeTheme()
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, style]}>
      {typeof children === 'string' ? (
        <Text
          style={{
            fontSize: 12,
            lineHeight: 18,
            color: theme.text.primary,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        color: theme.text.secondary,
        marginBottom: nativeSpace[1],
      }}
    >
      {children}
    </Text>
  )
}

export function MonoText({ children, style }: { children: ReactNode; style?: object }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      selectable
      style={[
        {
          fontFamily: nativeFontFamilies.mono,
          fontSize: 11,
          lineHeight: 16,
          color: theme.text.primary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function SecondaryText({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text style={{ fontSize: 11, color: theme.text.secondary }}>{children}</Text>
  )
}

export function PreLimited({
  lines,
  maxLines = 10,
  renderTruncationMessage,
}: {
  lines: string[]
  maxLines?: number
  renderTruncationMessage?: (omitted: number) => ReactNode
}) {
  const { theme } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)

  const { shownLines, omitted } = useMemo(() => {
    const safe = Array.isArray(lines) ? lines : []
    if (expanded) return { shownLines: safe, omitted: 0 }
    const slice = safe.slice(0, maxLines)
    return { shownLines: slice, omitted: Math.max(0, safe.length - slice.length) }
  }, [lines, maxLines, expanded])

  return (
    <View>
      <MonoText>{shownLines.join('\n')}</MonoText>
      {omitted > 0 ? (
        <Pressable onPress={() => setExpanded(true)} style={{ marginTop: 2 }}>
          <Text
            style={{
              fontSize: 11,
              color: theme.text.secondary,
              textDecorationLine: 'underline',
            }}
          >
            {renderTruncationMessage ? renderTruncationMessage(omitted) : `+ ${omitted} more`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function InlineOldNew({ oldVal, newVal }: { oldVal?: string; newVal?: string }) {
  if (!oldVal && !newVal) return null
  return (
    <View style={{ gap: nativeSpace[1] }}>
      {oldVal ? (
        <View>
          <SecondaryText>Old</SecondaryText>
          <MonoText>{oldVal}</MonoText>
        </View>
      ) : null}
      {newVal ? (
        <View>
          <SecondaryText>New</SecondaryText>
          <MonoText>{newVal}</MonoText>
        </View>
      ) : null}
    </View>
  )
}

export function NewContentOnly({ text, label }: { text?: string; label?: string }) {
  const header = label || 'New content only. Diff unavailable.'
  const lines = toLines(text)
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <SectionTitle>{header}</SectionTitle>
      <PreLimited lines={lines} maxLines={25} />
    </View>
  )
}

export function ReorderList({ items, movedId }: { items: unknown[]; movedId?: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      {items.map((it, idx) => {
        const item = it as { id?: string; key?: string; title?: string } | string | undefined
        const id =
          typeof item === 'string' ? item : item?.id || item?.key || item?.title || String(idx)
        const title =
          typeof item === 'object' && item ? item.title || id : (item as string) || String(id)
        const moved =
          !!movedId && ((typeof item === 'object' && item?.id === movedId) || id === movedId)
        return (
          <Text
            key={id}
            style={{
              fontSize: 12,
              color: theme.text.primary,
              fontWeight: moved ? '600' : '400',
            }}
          >
            {idx + 1}. {title}
          </Text>
        )
      })}
    </View>
  )
}
