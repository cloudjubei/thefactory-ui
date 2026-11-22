import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useTemplates, type Template } from '../../headless/contexts/TemplatesContext'
import { templateDifficultyLabel } from '../../headless/utils/createFromTemplate'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { nativeRadii, nativeSpace } from '../../tokens/native'

export type TemplatePickerProps = {
  /** Currently selected template id (controlled). */
  value?: string
  /** Called when the user picks a template. */
  onSelect: (template: Template) => void
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer for the template-picker step. Same prop API as the web
 * peer; renders selectable cards with thumbnail, difficulty and time.
 */
export default function TemplatePicker({ value, onSelect, style }: TemplatePickerProps) {
  const { templates, isLoaded, loadError } = useTemplates()
  const { theme } = useNativeTheme()

  if (loadError) {
    return (
      <View style={[{ padding: nativeSpace[4] }, style]}>
        <Text accessibilityRole="alert" style={{ color: theme.text.primary }}>
          Couldn&apos;t load templates: {loadError.message}
        </Text>
      </View>
    )
  }
  if (!isLoaded) {
    return (
      <View style={[{ padding: nativeSpace[4] }, style]}>
        <Text style={{ color: theme.text.secondary }}>Loading templates…</Text>
      </View>
    )
  }
  if (templates.length === 0) {
    return (
      <View style={[{ padding: nativeSpace[4] }, style]}>
        <Text style={{ color: theme.text.secondary }}>No templates available.</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={style}
      contentContainerStyle={{ gap: nativeSpace[3], padding: nativeSpace[4] }}
    >
      {templates.map((t) => {
        const selected = value === t.id
        const difficulty = templateDifficultyLabel(t.difficulty)
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={{
              overflow: 'hidden',
              borderRadius: nativeRadii[3],
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.accent.primary : theme.border.subtle,
              backgroundColor: theme.surface.base,
            }}
          >
            <View
              style={{
                aspectRatio: 16 / 9,
                backgroundColor: theme.surface.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {t.thumbnailUrl ? (
                <Image
                  source={{ uri: t.thumbnailUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Text style={{ color: theme.text.muted, fontSize: 18 }}>{t.name.slice(0, 1)}</Text>
              )}
            </View>
            <View style={{ gap: nativeSpace[2], padding: nativeSpace[3] }}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: theme.text.primary }}>
                {t.name}
              </Text>
              <Text style={{ color: theme.text.secondary, fontSize: 13 }} numberOfLines={2}>
                {t.description}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {difficulty ? (
                  <View
                    style={{
                      borderRadius: nativeRadii[2],
                      backgroundColor: theme.surface.muted,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: theme.text.secondary }}>{difficulty}</Text>
                  </View>
                ) : null}
                {t.estimatedTime ? (
                  <View
                    style={{
                      borderRadius: nativeRadii[2],
                      backgroundColor: theme.surface.muted,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                      {t.estimatedTime}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
