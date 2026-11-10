import { useMemo, type ReactNode } from 'react'
import { Linking, Text, View, type TextStyle } from 'react-native'
import { splitReferences } from 'thefactory-tools/utils'
import { useEffectiveReferenceRenderer } from '../../../headless/contexts/ReferenceRenderingContext'
import { useTicketLinks } from '../../../headless/contexts/TicketLinksContext'
import { splitTicketLinks } from '../../../headless/utils/ticketLinks'
import type { ReferenceTarget } from 'thefactory-tools/types'
import { nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { UikitFileMeta } from './FileDisplay'
import TicketLinkChip from '../chips/TicketLinkChip'
import ProjectFileChip from './ProjectFileChip'

export interface RichTextProps {
  text: string | null | undefined
  /** Resolves `@<token>` to a file. Returning `null` renders an unresolved pill. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Renders every reference other than a file — a story, feature, note or
   * attachment, or what was typed for one. Returning `undefined`, or omitting
   * it, renders the token as plain text. */
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Chip what was typed (`#3.2`, `&qa-login`) as well as what was sent as ids. */
  typedReferences?: boolean
  /**
   * Overrides the default text color. Used by the user-bubble in chat
   * messages to render white text on the blue background (matches web).
   */
  textColor?: string
  /** The size of the plain text between chips; 14 when left out. */
  fontSize?: number
  /** The weight of the plain text between chips. */
  fontWeight?: TextStyle['fontWeight']
}

export default function RichText({
  text,
  onResolveFile,
  renderReference: ownRenderReference,
  typedReferences = false,
  textColor,
  fontSize = 14,
  fontWeight,
}: RichTextProps) {
  const { theme } = useNativeTheme()
  const TOKEN_PILL_STYLE = {
    paddingHorizontal: nativeSpace[3],
    paddingVertical: 2,
    borderRadius: nativeRadii[1],
    borderWidth: 1,
    borderColor: theme.border.subtle,
  }
  const renderReference = useEffectiveReferenceRenderer(ownRenderReference, typedReferences)
  const segments = useMemo(() => splitReferences(text ?? ''), [text])
  const ticketSite = useTicketLinks()?.site
  const baseColor = textColor ?? theme.text.primary

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <Text key={idx} style={{ fontSize, fontWeight, color: baseColor }}>
              {splitTicketLinks(seg.value, ticketSite).map((part, at) =>
                part.type === 'text' ? (
                  part.value
                ) : part.type === 'ticket' ? (
                  <TicketLinkChip key={at} link={part} />
                ) : (
                  <Text
                    key={at}
                    accessibilityRole="link"
                    style={{ textDecorationLine: 'underline' }}
                    onPress={() => void Linking.openURL(part.url)}
                  >
                    {part.label}
                  </Text>
                ),
              )}
            </Text>
          )
        }
        if (
          seg.type !== 'reference' ||
          seg.reference.kind !== 'file' ||
          seg.reference.projectId ||
          !onResolveFile
        ) {
          const chip = renderReference?.(seg)
          if (chip) return <View key={idx}>{chip}</View>
          return (
            <Text key={idx} style={{ fontSize, fontWeight, color: baseColor }}>
              {seg.raw}
            </Text>
          )
        }
        const path = seg.reference.path
        const meta = onResolveFile?.(path) ?? null
        if (!meta) {
          return (
            <View
              key={idx}
              accessibilityLabel={`File not found: ${path}`}
              style={{
                ...TOKEN_PILL_STYLE,
                borderStyle: 'dashed',
                backgroundColor: 'transparent',
              }}
            >
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>@{path}</Text>
            </View>
          )
        }
        return (
          <View
            key={idx}
            style={{
              ...TOKEN_PILL_STYLE,
              backgroundColor: nativePalette.blue[50],
            }}
          >
            <ProjectFileChip file={meta} />
          </View>
        )
      })}
    </View>
  )
}
