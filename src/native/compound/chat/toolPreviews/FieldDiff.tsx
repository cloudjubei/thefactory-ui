import { useMemo, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { MonoText, SectionTitle, SecondaryText } from './components'

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)'
    return value.map((item) => `- ${String(item)}`).join('\n')
  }
  if (value == null || value === '') return '(empty)'
  return String(value)
}

// Word-level intra-line diffing isn't worth pulling in on native for
// chat-field previews — a plain `Current` / `Updated` block already lets
// the user compare values. (Mirrors the simplification web makes when the
// `sideBySide` flag is on.)
function diffLines(beforeText: string, afterText: string): { added: string[]; removed: string[] } {
  if (beforeText === afterText) return { added: [], removed: [] }
  const beforeSet = new Set(beforeText.split(/\r?\n/))
  const afterSet = new Set(afterText.split(/\r?\n/))
  const removed = beforeText.split(/\r?\n/).filter((l) => !afterSet.has(l))
  const added = afterText.split(/\r?\n/).filter((l) => !beforeSet.has(l))
  return { added, removed }
}

/**
 * Field-by-field diff used in story / feature update tool previews. Shows
 * a stacked old / new block on mobile (the `sideBySide` toggle is web-only
 * — there's no horizontal real estate on a phone). Mirrors web's
 * `FieldDiff` semantically: empty values render as `(empty)`, identical
 * values render as `No visible changes`.
 */
export function FieldDiff({
  label,
  before,
  after,
}: {
  label: string
  before: unknown
  after: unknown
  sideBySide?: boolean
}) {
  const { theme } = useNativeTheme()
  const beforeText = formatValue(before)
  const afterText = formatValue(after)
  const hasChanges = beforeText !== afterText
  const { added, removed } = useMemo(
    () => diffLines(beforeText, afterText),
    [beforeText, afterText],
  )

  return (
    <View style={{ gap: nativeSpace[1] }}>
      <SectionTitle>{label}</SectionTitle>
      {hasChanges ? (
        <View style={{ gap: nativeSpace[1] }}>
          {removed.length > 0 ? (
            <View>
              <SecondaryText>Removed</SecondaryText>
              <Text
                selectable
                style={{
                  fontFamily: nativeFontFamilies.mono,
                  fontSize: 11,
                  lineHeight: 16,
                  color: '#e2777a',
                }}
              >
                {removed.join('\n')}
              </Text>
            </View>
          ) : null}
          {added.length > 0 ? (
            <View>
              <SecondaryText>Added</SecondaryText>
              <Text
                selectable
                style={{
                  fontFamily: nativeFontFamilies.mono,
                  fontSize: 11,
                  lineHeight: 16,
                  color: '#7ec699',
                }}
              >
                {added.join('\n')}
              </Text>
            </View>
          ) : null}
          {removed.length === 0 && added.length === 0 ? (
            <View>
              <SecondaryText>Updated</SecondaryText>
              <MonoText>{afterText}</MonoText>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>No visible changes</Text>
      )}
    </View>
  )
}

export function SmallBadge({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        borderRadius: nativeRadii[1],
        paddingHorizontal: 4,
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '500', color: theme.text.secondary }}>
        {children}
      </Text>
    </View>
  )
}

/**
 * Generic patch-preview card used by `updateStory` / `updateFeature`. Same
 * semantic shape as the web `PatchPreview`: header chips + per-field diff
 * stack, falling back to a `completedCard` slot when the host wants to
 * render its rich card on completion.
 */
export function PatchPreview({
  headerBadge,
  headerId,
  headerSub,
  patchKeys,
  before,
  after,
  completedCard,
}: {
  headerBadge: string
  headerId?: string
  headerSub?: ReactNode
  patchKeys: string[]
  before: Record<string, unknown> | undefined
  after: Record<string, unknown> | undefined
  sideBySide?: boolean
  completedCard?: ReactNode
}) {
  const { theme } = useNativeTheme()
  if (completedCard) return <>{completedCard}</>

  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.base,
          borderRadius: nativeRadii[2],
          padding: nativeSpace[2],
          gap: nativeSpace[1],
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <SmallBadge>{headerBadge}</SmallBadge>
          {headerId ? (
            <Text
              style={{
                fontFamily: nativeFontFamilies.mono,
                fontSize: 11,
                color: theme.text.secondary,
              }}
            >
              {headerId}
            </Text>
          ) : null}
        </View>
        {headerSub}
      </View>

      {patchKeys.length > 0 ? (
        <View style={{ gap: nativeSpace[2] }}>
          {patchKeys.map((key) => (
            <FieldDiff key={key} label={key} before={before?.[key]} after={after?.[key]} />
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>No changed fields</Text>
      )}
    </View>
  )
}
