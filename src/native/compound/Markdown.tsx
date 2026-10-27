import { useMemo, type ReactNode } from 'react'
import { Linking, StyleSheet, Text, View, type TextStyle } from 'react-native'
import MarkdownDisplay, {
  type MarkdownProps as DisplayProps,
  type RenderRules,
} from 'react-native-markdown-display'
import {
  parseReferenceToken,
  parseResourceLink,
  withReferencesAsCode,
} from 'thefactory-tools/utils'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import { useEffectiveReferenceRenderer } from '../../headless/contexts/ReferenceRenderingContext'

import {
  nativeAlpha,
  nativeRadii,
  nativeSpace,
  type NativeSemanticTheme,
} from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type MarkdownProps = {
  text: string
  /** Allow raw HTML in the source. Matches the web peer's prop surface;
   *  ignored on native (react-native-markdown-display strips HTML by default). */
  allowHtml?: boolean
  /** Route an in-app `overseer://…` resource link here instead of opening it externally (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /**
   * Shows what the text points at as chips: a reference token (`#<storyId>`,
   * `&<noteId>`, `@path`, or a backticked project path) and an `overseer://`
   * link. Returning `undefined` leaves it as code or a plain link.
   */
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /**
   * Chip what was typed (`#3.2`, `&qa-login`) as well as what was sent as ids.
   * For text people write references into — a chat, a story. Off, a `#12` in a
   * document or a log stays text.
   */
  typedReferences?: boolean
  /** Text inside a line — a table cell, a list row: paragraphs keep no block margins. */
  inline?: boolean
  /** The body text's size and colour, for text set inside a smaller or muted line. */
  textStyle?: Pick<TextStyle, 'fontSize' | 'lineHeight' | 'color' | 'fontWeight'>
  /**
   * Code chrome for text on an accent (user) bubble: translucent white/black
   * instead of muted surface, matching web's `[&_code]:bg-white/20`.
   */
  onAccent?: boolean
}

/**
 * Native peer of [web's `Markdown`](../../web/compound/Markdown.tsx). Renders
 * GFM markdown via `react-native-markdown-display` with the same per-element
 * visual rhythm web's `<Markdown>` produces — paragraph margins, heading
 * weights, list indentation, code-block chrome. Styles route through the
 * runtime-reactive `useNativeTheme` hook for parity with sibling compounds.
 *
 * External links open via `Linking.openURL`. With `renderReference`, the
 * references in the text and its `overseer://` links show as chips.
 */
export default function Markdown({
  text,
  onResourceLink,
  renderReference: ownRenderReference,
  typedReferences = false,
  inline = false,
  textStyle,
  onAccent = false,
}: MarkdownProps) {
  const renderReference = useEffectiveReferenceRenderer(ownRenderReference, typedReferences)
  const { theme } = useNativeTheme()
  const fontSize = textStyle?.fontSize
  const lineHeight = textStyle?.lineHeight
  const color = textStyle?.color
  const fontWeight = textStyle?.fontWeight
  const styles = useMemo(
    () => makeStyles(theme, inline, { fontSize, lineHeight, color, fontWeight }, onAccent),
    [theme, inline, fontSize, lineHeight, color, fontWeight, onAccent],
  )

  const onLinkPress = useMemo<DisplayProps['onLinkPress']>(
    () => (url) => {
      const link = onResourceLink ? parseResourceLink(url) : undefined
      if (link) {
        onResourceLink!(link)
        return false
      }
      void Linking.openURL(url).catch(() => undefined)
      return false
    },
    [onResourceLink],
  )

  const rules = useMemo<RenderRules | undefined>(() => {
    if (!renderReference) return undefined
    return {
      code_inline: (node, _children, _parent, ruleStyles, inheritedStyles = {}) => {
        const parsed = parseReferenceToken(node.content)
        const chip = parsed ? renderReference(parsed) : undefined
        if (chip !== undefined) return <Text key={node.key}>{chip}</Text>
        return (
          <Text key={node.key} style={[inheritedStyles, ruleStyles.code_inline]}>
            {node.content}
          </Text>
        )
      },
      link: (node, children, _parent, ruleStyles) => {
        const href = String(node.attributes.href ?? '')
        const link = parseResourceLink(href)
        const chip = link ? renderReference({ type: 'link', link }) : undefined
        if (chip !== undefined) return <Text key={node.key}>{chip}</Text>
        return (
          <Text key={node.key} style={ruleStyles.link} onPress={() => onLinkPress?.(href)}>
            {children}
          </Text>
        )
      },
    }
  }, [renderReference, onLinkPress])

  return (
    <View>
      <MarkdownDisplay style={styles} onLinkPress={onLinkPress} {...(rules ? { rules } : {})}>
        {renderReference ? withReferencesAsCode(text) : text}
      </MarkdownDisplay>
    </View>
  )
}

function makeStyles(
  t: NativeSemanticTheme,
  inline: boolean,
  body: MarkdownProps['textStyle'],
  onAccent: boolean,
) {
  const bodyOverride = Object.fromEntries(
    Object.entries(body ?? {}).filter(([, value]) => value !== undefined),
  )
  // On an accent bubble, muted surface chrome washes out — match web's
  // `[&_code]:bg-white/20` / `[&_pre]:bg-black/25` with on-accent text.
  const codeInlineBg = onAccent ? nativeAlpha('#ffffff', 0.2) : t.surface.muted
  const codeBlockBg = onAccent ? nativeAlpha('#000000', 0.25) : t.surface.muted
  const codeColorStyle = onAccent
    ? { color: body?.color ?? t.text.onAccent }
    : ({} as { color?: string })
  // Sizes mirror web's Tailwind classes: text-2xl (24) for h1, text-xl (20)
  // for h2 + h3, text-lg (18) for h4, text-base (16) for h5, text-sm (14) for
  // h6. Paragraph rhythm uses `marginVertical: nativeSpace[1]` (~4px) to
  // approximate web's `my-1`. Lists use `ml-6` ≈ 24px indent.
  return StyleSheet.create({
    body: { color: t.text.primary, fontSize: 14, lineHeight: 21, ...bodyOverride },
    paragraph: inline
      ? { marginTop: 0, marginBottom: 0 }
      : { marginTop: nativeSpace[1], marginBottom: nativeSpace[1] },
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
    link: {
      color: onAccent ? (body?.color ?? t.text.onAccent) : t.accent.primary,
      textDecorationLine: 'underline',
    },
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
      backgroundColor: codeInlineBg,
      ...codeColorStyle,
    },
    code_block: {
      fontFamily: 'Menlo',
      fontSize: 13,
      padding: nativeSpace[3],
      borderRadius: nativeRadii[3],
      backgroundColor: codeBlockBg,
      marginVertical: nativeSpace[3],
      ...codeColorStyle,
    },
    fence: {
      fontFamily: 'Menlo',
      fontSize: 13,
      padding: nativeSpace[3],
      borderRadius: nativeRadii[3],
      backgroundColor: codeBlockBg,
      marginVertical: nativeSpace[3],
      ...codeColorStyle,
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
