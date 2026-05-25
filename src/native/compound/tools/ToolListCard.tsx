import { Pressable, Text } from 'react-native'
import { nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

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
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        paddingHorizontal: nativeSpace[5],
        paddingVertical: nativeSpace[4],
        borderColor: isActive ? nativePalette.blue[500] : theme.border.subtle,
        backgroundColor: isActive
          ? nativePalette.blue[50]
          : pressed
            ? theme.surface.muted
            : theme.surface.raised,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: isActive ? nativePalette.blue[700] : theme.text.primary,
        }}
        numberOfLines={1}
      >
        <Text style={{ fontFamily: 'Menlo' }}>{name}</Text>
      </Text>
      <Text
        style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4 }}
        numberOfLines={2}
      >
        {description || 'No description provided.'}
      </Text>
    </Pressable>
  )
}
