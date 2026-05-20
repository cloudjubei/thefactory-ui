import { useMemo } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import MarkdownDisplay, { type MarkdownProps as DisplayProps } from 'react-native-markdown-display'

import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

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
 * weights, list indentation, code-block chrome. Styles route through
 * `nativeLightTheme` tokens for parity with sibling compounds; native dark
 * mode is not wired across `src/native/` yet (tracked separately).
 *
 * External links open via `Linking.openURL`. Inline `@<path>` /
 * `#<dep>` mentions are not interpreted here — render the source through
 * [`RichText`](./files/RichText.tsx) for the mention-aware variant.
 */
export default function Markdown({ text }: MarkdownProps) {
  const styles = useMemo(() => makeStyles(), [])

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

function makeStyles() {
  const t = nativeLightTheme
  return StyleSheet.create({
    body: { color: t.text.primary, fontSize: 14, lineHeight: 20 },
    paragraph: { marginTop: 0, marginBottom: nativeSpace[2] },
    heading1: {
      fontSize: 22,
      fontWeight: '700',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      paddingBottom: nativeSpace[1],
      borderBottomWidth: 1,
      borderBottomColor: t.border.subtle,
      color: t.text.primary,
    },
    heading2: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: nativeSpace[3],
      marginBottom: nativeSpace[2],
      paddingBottom: nativeSpace[1],
      borderBottomWidth: 1,
      borderBottomColor: t.border.subtle,
      color: t.text.primary,
    },
    heading3: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: nativeSpace[2],
      marginBottom: nativeSpace[1],
      color: t.text.primary,
    },
    heading4: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: nativeSpace[2],
      marginBottom: nativeSpace[1],
      color: t.text.primary,
    },
    heading5: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: nativeSpace[2],
      marginBottom: nativeSpace[1],
      color: t.text.primary,
    },
    heading6: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: nativeSpace[2],
      marginBottom: nativeSpace[1],
      color: t.text.secondary,
    },
    strong: { fontWeight: '600' },
    em: { fontStyle: 'italic' },
    link: { color: t.accent.primary, textDecorationLine: 'underline' },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: t.border.default,
      paddingLeft: nativeSpace[2],
      marginVertical: nativeSpace[2],
      backgroundColor: 'transparent',
    },
    hr: { backgroundColor: t.border.subtle, height: 1, marginVertical: nativeSpace[3] },
    bullet_list: { marginBottom: nativeSpace[2] },
    ordered_list: { marginBottom: nativeSpace[2] },
    list_item: { flexDirection: 'row', marginBottom: 2 },
    code_inline: {
      fontFamily: 'Courier',
      fontSize: 13,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: nativeRadii[2],
      backgroundColor: t.surface.muted,
    },
    code_block: {
      fontFamily: 'Courier',
      fontSize: 13,
      padding: nativeSpace[2],
      borderRadius: nativeRadii[3],
      backgroundColor: t.surface.muted,
      marginVertical: nativeSpace[2],
    },
    fence: {
      fontFamily: 'Courier',
      fontSize: 13,
      padding: nativeSpace[2],
      borderRadius: nativeRadii[3],
      backgroundColor: t.surface.muted,
      marginVertical: nativeSpace[2],
    },
    table: {
      borderWidth: 1,
      borderColor: t.border.subtle,
      borderRadius: nativeRadii[3],
      marginVertical: nativeSpace[2],
    },
    tr: { borderBottomWidth: 1, borderBottomColor: t.border.subtle },
    th: { padding: nativeSpace[2], fontWeight: '600', backgroundColor: t.surface.muted },
    td: { padding: nativeSpace[2] },
  })
}
