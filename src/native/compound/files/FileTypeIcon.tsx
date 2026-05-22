import { Text, View } from 'react-native'
import { classifyFileByExtension } from '../../../headless'
import { nativePalette } from '../../../tokens/native'

export interface FileTypeIconProps {
  /** File path or name — the extension drives the icon. */
  path: string
  size?: number
}

const KIND_STYLE: Record<string, { glyph: string; color: string }> = {
  markdown: { glyph: 'M', color: nativePalette.blue[600] },
  html: { glyph: '<>', color: nativePalette.orange[600] },
  image: { glyph: '▦', color: nativePalette.green[600] },
  pdf: { glyph: '¶', color: nativePalette.red[600] },
  text: { glyph: '≡', color: nativePalette.gray[600] },
  binary: { glyph: '⬡', color: nativePalette.gray[600] },
}

/**
 * Native peer of web's `FileTypeIcon` — a compact extension-derived badge
 * for a file in the tree / list. Classification is shared with web via
 * headless `classifyFileByExtension`.
 */
export default function FileTypeIcon({ path, size = 16 }: FileTypeIconProps) {
  const kind = classifyFileByExtension(path)
  const style = KIND_STYLE[kind] ?? KIND_STYLE.binary
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.7, fontWeight: '700', color: style.color }}>
        {style.glyph}
      </Text>
    </View>
  )
}
