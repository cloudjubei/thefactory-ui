import { Pressable, View } from 'react-native'
import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import FileTypeIcon from '../files/FileTypeIcon'
import WarningChip from './WarningChip'
import { IconXCircle } from '../../icons'
import { nativeLightStatus, nativeSpace } from '../../../tokens/native'

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
    // Full-row layout: each chip claims the parent's full width, so the
    // wrapping `Blockers / Context Files` row stacks one chip per line and
    // both the title and meta have plenty of horizontal space. The chip
    // itself is intentionally borderless — the surrounding `Field` box owns
    // the container border.
    <View style={{ position: 'relative', width: '100%' }}>
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
        leadingVisual={
          <FileTypeIcon path={file.relativePath ?? file.name} type={file.type} size={18} />
        }
        trailing={
          onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove file"
              onPress={onRemove}
              hitSlop={6}
              style={({ pressed }) => ({
                padding: nativeSpace[2],
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <IconXCircle size={16} color={nativeLightStatus.stuck.bg} />
            </Pressable>
          ) : undefined
        }
      />
    </View>
  )
}
