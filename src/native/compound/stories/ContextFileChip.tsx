import { Pressable, Text, View } from 'react-native'
import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import WarningChip from './WarningChip'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export interface ContextFileChipProps {
  file: UikitFileMeta
  /** Optional remove handler — when provided, surfaces an `×` button. */
  onRemove?: () => void
  /** When true, overlays a small `WarningChip` (e.g. "file attached but not
   * referenced in the surrounding text"). */
  warn?: boolean
}

export default function ContextFileChip({ file, onRemove, warn }: ContextFileChipProps) {
  return (
    <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
      {warn && (
        <View style={{ position: 'absolute', top: -4, left: -4, zIndex: 1 }}>
          <WarningChip
            title="File not referenced in text"
            tooltip="File not referenced in title/description/rejection"
          />
        </View>
      )}
      <FileDisplay
        file={file}
        density="normal"
        trailing={
          onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove file"
              onPress={onRemove}
              hitSlop={4}
              style={({ pressed }) => ({
                padding: nativeSpace[2],
                opacity: pressed ? 0.5 : 0.7,
              })}
            >
              <Text style={{ fontSize: 14, color: nativeLightTheme.text.secondary }}>×</Text>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  )
}
