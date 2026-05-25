import { useMemo } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import MarkdownDisplay, { type MarkdownProps as DisplayProps } from 'react-native-markdown-display'

import { nativeRadii, nativeSpace, type NativeSemanticTheme } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type MarkdownProps = {
  text: string
  /** Allow raw HTML in the source. Matches the web peer's prop surface;
   *  ignored on native (react-native-markdown-display strips HTML by default). */
  allowHtml?: boolean
}

/**
 * Native peer of [web's `Markdown`](../../web/compound/Markdown.tsx). Renders
 * GFM markdown via `react-native-markdown-display` with the same per-element
 * visual rhythm web's `<Markdown>` produces — paragraph margins, heading
 * weights, list indentation, code-block chrome. Styles route through the
 * runtime-reactive `useNativeTheme` hook for parity with sibling compounds.
 *
 * External links open via `Linking.openURL`. Inline `@<path>` /
 * `#<dep>` mentions are not interpreted here — render the source through
 * [`RichText`](./files/RichText.tsx) for the mention-aware variant.
 */
export default function Markdown({ text }: MarkdownProps) {
  const { theme } = useNativeTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  const onLinkPress = useMemo<DisplayProps['onLinkPress']>(
    () => (url) => {
      void Linking.openURL(url).catch(() => undefined)
      return false
    },
    [],
  )

  return (
    <View>
      <MarkdownDisplay style={styles} onLinkPress={onLinkPress}>
        {text}
      </MarkdownDisplay>
    </View>
  )
}

function makeStyles(t: NativeSemanticTheme) {
  // Sizes mirror web's Tailwind classes: text-2xl (24) for h1, text-xl (20)
  // for h2 + h3, text-lg (18) for h4, text-base (16) for h5, text-sm (14) for
  // h6. Paragraph rhythm uses `marginVertical: nativeSpace[1]` (~4px) to
  // approximate web's `my-1`. Lists use `ml-6` ≈ 24px indent.
  return StyleSheet.create({
    body: { color: t.text.primary, fontSize: 14, lineHeight: 21 },
    paragraph: { marginTop: nativeSpace[1], marginBottom: nativeSpace[1] },
    heading1: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      paddingBottom: nativeSpace[1],
      borderBottomWidth: 1,
      borderBottomColor: t.border.subtle,
      color: t.text.primary,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      paddingBottom: nativeSpace[1],
      borderBottomWidth: 1,
      borderBottomColor: t.border.subtle,
      color: t.text.primary,
    },
    heading3: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      color: t.text.primary,
    },
    heading4: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      color: t.text.primary,
    },
    heading5: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      color: t.text.primary,
    },
    heading6: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      color: t.text.primary,
    },
    strong: { fontWeight: '600' },
    em: { fontStyle: 'italic' },
    link: { color: t.accent.primary, textDecorationLine: 'underline' },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: t.border.default,
      paddingLeft: nativeSpace[2],
      marginVertical: nativeSpace[2],
      color: t.text.secondary,
      backgroundColor: 'transparent',
    },
    hr: { backgroundColor: t.border.subtle, height: 1, marginVertical: nativeSpace[3] },
    bullet_list: { marginBottom: nativeSpace[3], paddingLeft: nativeSpace[4] },
    ordered_list: { marginBottom: nativeSpace[3], paddingLeft: nativeSpace[4] },
    list_item: { flexDirection: 'row', marginBottom: nativeSpace[1] },
    code_inline: {
      fontFamily: 'Menlo',
      fontSize: 13,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: nativeRadii[2],
      backgroundColor: t.surface.muted,
    },
    code_block: {
      fontFamily: 'Menlo',
      fontSize: 13,
      padding: nativeSpace[3],
      borderRadius: nativeRadii[3],
      backgroundColor: t.surface.muted,
      marginVertical: nativeSpace[3],
    },
    fence: {
      fontFamily: 'Menlo',
      fontSize: 13,
      padding: nativeSpace[3],
      borderRadius: nativeRadii[3],
      backgroundColor: t.surface.muted,
      marginVertical: nativeSpace[3],
    },
    table: {
      borderWidth: 1,
      borderColor: t.border.subtle,
      borderRadius: nativeRadii[3],
      marginVertical: nativeSpace[3],
    },
    tr: { borderBottomWidth: 1, borderBottomColor: t.border.subtle },
    th: { padding: nativeSpace[2], fontWeight: '600', backgroundColor: t.surface.muted },
    td: { padding: nativeSpace[2] },
  })
}
