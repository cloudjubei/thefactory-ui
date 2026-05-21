import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export interface AppHeaderProps {
  /** Centred screen title. */
  title?: string
  /** Left slot — typically the hamburger (top-level) or back button (detail). */
  left?: ReactNode
  /** Right slot — screen actions. */
  right?: ReactNode
}

/** Keeps the title optically centred regardless of slot content width. */
const SIDE_MIN_WIDTH = 56
const HEADER_HEIGHT = 52

/**
 * The single shared header bar above every screen: a left slot (hamburger or
 * back), a centred title, and a right slot for screen actions. The native peer
 * of the web shell's responsive header.
 */
export default function AppHeader({ title, left, right }: AppHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: HEADER_HEIGHT,
        paddingHorizontal: nativeSpace[2],
        borderBottomWidth: 1,
        borderBottomColor: nativeLightTheme.border.subtle,
        backgroundColor: nativeLightTheme.surface.base,
      }}
    >
      <View style={{ minWidth: SIDE_MIN_WIDTH, alignItems: 'flex-start' }}>{left}</View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          flex: 1,
          textAlign: 'center',
          paddingHorizontal: nativeSpace[2],
          fontSize: 16,
          fontWeight: '600',
          color: nativeLightTheme.text.primary,
        }}
      >
        {title}
      </Text>
      <View style={{ minWidth: SIDE_MIN_WIDTH, alignItems: 'flex-end' }}>{right}</View>
    </View>
  )
}
