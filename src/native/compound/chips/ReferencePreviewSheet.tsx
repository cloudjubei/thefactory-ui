import type { ComponentType, ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'
import type { ReferencePreview } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'

export type ReferencePreviewSheetProps = {
  isOpen: boolean
  onClose: () => void
  view: ReferencePreview
  glyph: ComponentType<{ size?: number; color?: string }>
  /** Opens what the sheet is about; without it, the sheet offers no button. */
  onOpen?: (link: ResourceLink) => void
  /** A second action beside the open button — a run's chat. */
  secondary?: { label: string; onSelect: () => void }
  /** More to show under the lines — a design's miniature. */
  children?: ReactNode
}

/**
 * Native peer of web's `ReferencePreviewCard`: what a reference is, in a sheet
 * a long press opens — its kind, its number and title, its status, a line or
 * two about it, and the button that opens it.
 */
export default function ReferencePreviewSheet({
  isOpen,
  onClose,
  view,
  glyph: Glyph,
  onOpen,
  secondary,
  children,
}: ReferencePreviewSheetProps) {
  const { theme, status } = useNativeTheme()
  const primary = view.primary && onOpen ? view.primary : undefined
  const pill = view.status ? status[view.status.tone] : undefined
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      headerNode={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Glyph size={16} color={theme.text.secondary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '600',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: theme.text.secondary,
              }}
            >
              {view.caption}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
              {view.title}
            </Text>
          </View>
        </View>
      }
      footer={
        primary || secondary ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            {primary ? (
              <Button
                variant="primary"
                onPress={() => {
                  onClose()
                  onOpen?.(primary.link)
                }}
              >
                {primary.label}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                variant="secondary"
                onPress={() => {
                  onClose()
                  secondary.onSelect()
                }}
              >
                {secondary.label}
              </Button>
            ) : null}
          </View>
        ) : undefined
      }
    >
      <View style={{ gap: nativeSpace[3], paddingBottom: nativeSpace[4] }}>
        {view.status && pill ? (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: pill.softBg,
              borderColor: pill.softBorder,
              borderWidth: 1,
              borderRadius: nativeRadii[2],
              paddingHorizontal: nativeSpace[2],
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: pill.softFg }}>
              {view.status.label}
            </Text>
          </View>
        ) : null}
        {view.lines.map((line) => (
          <View
            key={`${line.label}:${line.value}`}
            style={{ flexDirection: 'row', gap: nativeSpace[3] }}
          >
            {line.label ? (
              <Text style={{ width: 74, fontSize: 13, color: theme.text.secondary }}>
                {line.label}
              </Text>
            ) : null}
            <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{line.value}</Text>
          </View>
        ))}
        {children}
      </View>
    </BottomSheet>
  )
}
