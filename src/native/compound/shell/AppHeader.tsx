import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeSpace } from '../../../tokens/native'

export interface AppHeaderProps {
  /** Screen title — sits immediately to the right of the left slot. */
  title?: string
  /** Left slot — typically the hamburger (top-level) or back button (detail). */
  left?: ReactNode
  /** Right slot — screen actions. */
  right?: ReactNode
}

const HEADER_HEIGHT = 52

/**
 * The single shared header bar above every screen: a left slot (hamburger or
 * back), the screen title immediately next to it, and a right slot for screen
 * actions on the trailing edge. Title is left-aligned next to the menu button,
 * matching iOS large-title leading-aligned conventions; the right slot
 * absorbs any remaining width.
 */
export default function AppHeader({ title, left, right }: AppHeaderProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: HEADER_HEIGHT,
        paddingHorizontal: nativeSpace[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      <View style={{ alignItems: 'flex-start' }}>{left}</View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          flex: 1,
          paddingHorizontal: nativeSpace[2],
          fontSize: 17,
          fontWeight: '600',
          color: theme.text.primary,
        }}
      >
        {title}
      </Text>
      <View style={{ alignItems: 'flex-end' }}>{right}</View>
    </View>
  )
}
