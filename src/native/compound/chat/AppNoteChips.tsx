import { Pressable, Text, TextInput, View } from 'react-native'
import { appNoteLabel } from '../../../headless/utils/appNotes'
import type { AppNoteComposerProps } from '../../../headless/utils/appNotesTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export default function AppNoteChips({
  appNotes = [],
  onChangeAppNotes,
  onShowApp,
}: AppNoteComposerProps) {
  const { theme } = useNativeTheme()
  return (
    <View accessibilityLabel="App selections" style={{ gap: 8 }}>
      {onShowApp ? (
        <Pressable accessibilityRole="button" onPress={onShowApp}>
          <Text style={{ color: theme.accent.primary }}>Show app</Text>
        </Pressable>
      ) : null}
      {appNotes.map((note, index) => (
        <View
          key={note.id}
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
              {index + 1}. {appNoteLabel(note)}
            </Text>
            {onChangeAppNotes ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove app selection ${index + 1}`}
                onPress={() => onChangeAppNotes(appNotes.filter((item) => item.id !== note.id))}
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
            value={note.comment}
            editable={!!onChangeAppNotes}
            onChangeText={(comment) =>
              onChangeAppNotes?.(
                appNotes.map((item) => (item.id === note.id ? { ...item, comment } : item)),
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
