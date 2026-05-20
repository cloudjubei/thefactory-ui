import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { extFromTypeOrName, formatBytes, formatFileDate } from '../../../headless/utils/path'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface UikitFileMeta {
  name: string
  relativePath?: string
  absolutePath?: string
  type?: string | null
  size?: number | null
  mtime?: number | string | Date | null
}

export interface FileDisplayProps {
  file: UikitFileMeta
  density?: 'normal' | 'compact'
  interactive?: boolean
  leadingVisual?: ReactNode
  trailing?: ReactNode
  showMeta?: boolean
  ariaLabel?: string
  onPress?: (file: UikitFileMeta) => void
  /** Open-on-press fallback when `onPress` isn't provided. */
  onNavigate?: (file: UikitFileMeta) => void
  className?: string
  style?: StyleProp<ViewStyle>
}

const EXT_GLYPH: Record<string, string> = {
  md: '📝',
  markdown: '📝',
  json: '🔖',
  js: '🟨',
  cjs: '🟨',
  mjs: '🟨',
  ts: '🟦',
  tsx: '🟦',
  css: '🎨',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  gif: '🖼️',
  svg: '🖼️',
  pdf: '📕',
  zip: '🗜️',
  txt: '📄',
  log: '📜',
}

function glyphFor(file: UikitFileMeta): string {
  const ext = extFromTypeOrName(file.type ?? undefined, file.name)
  return (ext && EXT_GLYPH[ext]) ?? '📄'
}

export default function FileDisplay({
  file,
  density = 'normal',
  interactive = false,
  leadingVisual,
  trailing,
  showMeta = true,
  ariaLabel,
  onPress,
  onNavigate,
  className,
  style,
}: FileDisplayProps) {
  const sizeLabel = formatBytes(file.size ?? null)
  const dateLabel = formatFileDate(file.mtime ?? null)
  const aria =
    ariaLabel ??
    `${file.name}${sizeLabel ? `, ${sizeLabel}` : ''}${dateLabel ? `, modified ${dateLabel}` : ''}`

  const handlePress = () => {
    if (onPress) onPress(file)
    else if (onNavigate) onNavigate(file)
  }

  if (density === 'compact') {
    return (
      <View
        className={className}
        accessibilityLabel={aria}
        style={[
          {
            alignSelf: 'flex-start',
            paddingHorizontal: nativeSpace[5],
            paddingVertical: 2,
            borderRadius: nativeRadii.round,
            backgroundColor: nativeLightTheme.surface.muted,
            borderWidth: 1,
            borderColor: nativeLightTheme.border.subtle,
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>{file.name}</Text>
      </View>
    )
  }

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[4],
        minWidth: 0,
      }}
    >
      <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
        {leadingVisual ?? <Text style={{ fontSize: 18 }}>{glyphFor(file)}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, color: nativeLightTheme.text.primary }}>
          {file.name}
        </Text>
        {showMeta && (sizeLabel || dateLabel) && (
          <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted }}>
            {[sizeLabel, dateLabel].filter(Boolean).join(' • ')}
          </Text>
        )}
      </View>
      {trailing && <View style={{ width: 28, alignItems: 'center' }}>{trailing}</View>}
    </View>
  )

  if (interactive) {
    return (
      <Pressable
        className={className}
        accessibilityRole="button"
        accessibilityLabel={aria}
        onPress={handlePress}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}
      >
        {body}
      </Pressable>
    )
  }

  return (
    <View className={className} accessibilityLabel={aria} style={style}>
      {body}
    </View>
  )
}
