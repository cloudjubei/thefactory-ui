import { Pressable, Text, TextInput, View } from 'react-native'
import type { AppSelectionComposerProps } from '../../../headless/utils/appSelections'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export default function AppSelectionChips({
  appSelections = [],
  onChangeAppSelections,
  onShowApp,
}: AppSelectionComposerProps) {
  const { theme } = useNativeTheme()
  return (
    <View accessibilityLabel="App selections" style={{ gap: 8 }}>
      {onShowApp ? (
        <Pressable accessibilityRole="button" onPress={onShowApp}>
          <Text style={{ color: theme.accent.primary }}>Show app</Text>
        </Pressable>
      ) : null}
      {appSelections.map((selection, index) => (
        <View
          key={selection.id}
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: 8,
            padding: 8,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ flex: 1, color: theme.text.primary }}>
              {index + 1}. {selection.selector}
            </Text>
            {onChangeAppSelections ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove app selection ${index + 1}`}
                onPress={() =>
                  onChangeAppSelections(appSelections.filter((item) => item.id !== selection.id))
                }
              >
                <Text style={{ color: theme.text.secondary }}>×</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            accessibilityLabel={`Comment on app selection ${index + 1}`}
            placeholder="What should change here?"
            placeholderTextColor={theme.text.muted}
            multiline
            value={selection.comment}
            editable={!!onChangeAppSelections}
            onChangeText={(comment) =>
              onChangeAppSelections?.(
                appSelections.map((item) =>
                  item.id === selection.id ? { ...item, comment } : item,
                ),
              )
            }
            style={{
              minHeight: 44,
              color: theme.text.primary,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              padding: 8,
              borderRadius: 4,
            }}
          />
        </View>
      ))}
    </View>
  )
}
