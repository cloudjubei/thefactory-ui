import { useState, type ReactNode } from 'react'
import { Text } from 'react-native'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { referencePreview, type ReferencePreview } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ReferencePreviewSheet from './ReferencePreviewSheet'
import { referenceGlyph } from './referenceGlyphs'

export type ReferenceChipProps = {
  description: ReferenceDescription
  /** Opens what the chip points at. Omitted, or for something gone, a tap opens nothing. */
  onOpen?: (link: ResourceLink) => void
  /** Replaces the long press that shows its preview — a design chip shows its miniature instead. */
  onLongPress?: () => void
  /** The pill the chip shows, over the one its description has — a run's live status. */
  status?: ReferencePreview['status']
  /** The preview its long press shows, in place of the one its description makes — a run's, live. */
  preview?: ReferencePreview
  /** A second action in its preview — a run's chat. */
  secondary?: { label: string; onSelect: () => void }
  /** More to show in its preview — a design's miniature. */
  children?: ReactNode
}

/**
 * Native peer of web's `ReferenceChip`: something a message points at, inline
 * in the text — its current number or name with its title and status, a tap
 * that opens it, and a long press that shows its preview. Something still
 * being looked up reads muted; something gone reads struck through and opens
 * nothing.
 */
export default function ReferenceChip({
  description,
  onOpen,
  onLongPress,
  status,
  preview,
  secondary,
  children,
}: ReferenceChipProps) {
  const { theme, status: tones } = useNativeTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const view = preview ?? referencePreview(description)
  const pill = description.missing ? undefined : (status ?? view.status)
  const link = description.missing || description.loading ? undefined : description.link
  const open = link && onOpen ? () => onOpen(link) : undefined
  const title = description.loading ? undefined : description.title
  const muted = description.missing || description.loading
  return (
    <>
      <Text
        accessibilityRole={open ? 'link' : 'text'}
        accessibilityLabel={[description.label, title, pill?.label].filter(Boolean).join(' ')}
        {...(description.detail ? { accessibilityHint: description.detail } : {})}
        onPress={open}
        onLongPress={onLongPress ?? (() => setSheetOpen(true))}
        style={{
          fontSize: 13,
          color: muted ? theme.text.muted : open ? theme.accent.primary : theme.text.secondary,
          backgroundColor: theme.surface.muted,
          borderRadius: nativeRadii[2],
          textDecorationLine: description.missing ? 'line-through' : 'none',
        }}
      >
        {` ${description.label}`}
        {title ? <Text style={{ color: theme.text.primary }}>{` ${title}`}</Text> : null}
        {pill ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: tones[pill.tone].softFg }}>
            {` · ${pill.label}`}
          </Text>
        ) : null}{' '}
      </Text>
      {onLongPress || !sheetOpen ? null : (
        <ReferencePreviewSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          view={view}
          glyph={referenceGlyph(description)}
          {...(onOpen ? { onOpen } : {})}
          {...(secondary ? { secondary } : {})}
        >
          {children}
        </ReferencePreviewSheet>
      )}
    </>
  )
}
