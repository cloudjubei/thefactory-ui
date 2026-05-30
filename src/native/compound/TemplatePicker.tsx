import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTemplates, type Template } from '../../headless/contexts/TemplatesContext'

export type TemplatePickerProps = {
  /** Currently selected template id (controlled). */
  value?: string
  /** Called when the user picks a template. */
  onSelect: (template: Template) => void
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer for the template-picker step. Same prop API as the web
 * peer; renders selectable cards using RN primitives.
 */
export default function TemplatePicker({ value, onSelect, style }: TemplatePickerProps) {
  const { templates, isLoaded, loadError } = useTemplates()

  if (loadError) {
    return (
      <View style={[{ padding: 16 }, style]}>
        <Text accessibilityRole="alert">Couldn&apos;t load templates: {loadError.message}</Text>
      </View>
    )
  }
  if (!isLoaded) {
    return (
      <View style={[{ padding: 16 }, style]}>
        <Text>Loading templates…</Text>
      </View>
    )
  }
  if (templates.length === 0) {
    return (
      <View style={[{ padding: 16 }, style]}>
        <Text>No templates available.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={style} contentContainerStyle={{ gap: 12, padding: 16 }}>
      {templates.map((t) => {
        const selected = value === t.id
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={{
              padding: 16,
              borderRadius: 8,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? '#2563eb' : '#e5e7eb',
              backgroundColor: '#ffffff',
            }}
          >
            <Text style={{ fontWeight: '600', marginBottom: 4 }}>{t.name}</Text>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>{t.description}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
