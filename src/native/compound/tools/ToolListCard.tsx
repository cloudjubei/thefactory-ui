import { Pressable, Text } from 'react-native'
import { nativeLightTheme, nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface ToolListCardProps {
  name: string
  description?: string
  isActive?: boolean
  onPress: () => void
}

/**
 * Native peer of web `ToolsView`'s `ToolListCard` — a tappable card for one
 * tool in the (category-grouped) tool list.
 */
export default function ToolListCard({
  name,
  description,
  isActive = false,
  onPress,
}: ToolListCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        padding: nativeSpace[3],
        borderColor: isActive ? nativePalette.blue[500] : nativeLightTheme.border.subtle,
        backgroundColor: isActive
          ? nativePalette.blue[50]
          : pressed
            ? nativeLightTheme.surface.muted
            : nativeLightTheme.surface.raised,
      })}
    >
      <Text
        style={{
          fontFamily: 'Menlo',
          fontSize: 13,
          fontWeight: '600',
          color: isActive ? nativePalette.blue[700] : nativeLightTheme.text.primary,
        }}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={{ fontSize: 12, color: nativeLightTheme.text.secondary, marginTop: 2 }}
        numberOfLines={2}
      >
        {description || 'No description provided.'}
      </Text>
    </Pressable>
  )
}
