import { Pressable, Text, View } from 'react-native'
import { countPatchAddDel } from 'thefactory-tools/utils'
import { nativeLightTheme, nativePalette, nativeSpace } from '../../../tokens/native'
import GitFileStatusIcon from './GitFileStatusIcon'

export interface GitFileEntryLike {
  path: string
  status?: string
  patch?: string
  binary?: boolean
  isConflicted?: boolean
}

export interface GitFileRowProps {
  file: GitFileEntryLike
  /** Whether the file is staged — drives the checkbox. Omit to hide it. */
  checked?: boolean
  onToggle?: (file: GitFileEntryLike) => void
  /** Tapping the row body — typically opens the file diff. */
  onPress?: (file: GitFileEntryLike) => void
  /** Discard local changes. */
  onReset?: (file: GitFileEntryLike) => void
  /** Delete the file. */
  onRemove?: (file: GitFileEntryLike) => void
  /** Resolve a merge conflict. */
  onResolveConflict?: (file: GitFileEntryLike) => void
}

/**
 * Native peer of web's `GitFileRow` — one file in a Git changes list.
 * Touch has no hover, so the reset / remove / resolve actions are
 * always-visible inline buttons rather than hover-revealed.
 */
export default function GitFileRow({
  file,
  checked,
  onToggle,
  onPress,
  onReset,
  onRemove,
  onResolveConflict,
}: GitFileRowProps) {
  const { add, del } = countPatchAddDel(file.patch)
  const name = file.path.split('/').pop() ?? file.path
  const dir = file.path.slice(0, file.path.length - name.length)

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        borderBottomWidth: 1,
        borderBottomColor: nativeLightTheme.border.subtle,
        backgroundColor: file.isConflicted
          ? 'rgba(220,38,38,0.06)'
          : nativeLightTheme.surface.raised,
      }}
    >
      {onToggle ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!checked }}
          accessibilityLabel={checked ? `Unstage ${file.path}` : `Stage ${file.path}`}
          onPress={() => onToggle(file)}
          hitSlop={6}
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: checked ? nativeLightTheme.accent.primary : nativeLightTheme.border.strong,
            backgroundColor: checked ? nativeLightTheme.accent.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? (
            <Text style={{ fontSize: 12, color: '#ffffff', fontWeight: '700' }}>✓</Text>
          ) : null}
        </Pressable>
      ) : null}

      <GitFileStatusIcon status={file.status} isConflicted={file.isConflicted} />

      <Pressable
        accessibilityRole="button"
        onPress={onPress ? () => onPress(file) : undefined}
        disabled={!onPress}
        style={{ flex: 1, minWidth: 0 }}
      >
        <Text
          style={{ fontFamily: 'Menlo', fontSize: 12, color: nativeLightTheme.text.primary }}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {dir ? (
            <Text style={{ color: nativeLightTheme.text.muted }}>{dir}</Text>
          ) : null}
          {name}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}>
        {add > 0 ? (
          <Text style={{ fontFamily: 'Menlo', fontSize: 10, color: nativePalette.green[700] }}>
            +{add}
          </Text>
        ) : null}
        {del > 0 ? (
          <Text style={{ fontFamily: 'Menlo', fontSize: 10, color: nativePalette.red[700] }}>
            -{del}
          </Text>
        ) : null}
      </View>

      {file.isConflicted && onResolveConflict ? (
        <RowAction label="Resolve" onPress={() => onResolveConflict(file)} tint={nativePalette.orange[700]} />
      ) : null}
      {onReset ? (
        <RowAction label="↶" onPress={() => onReset(file)} tint={nativePalette.red[600]} />
      ) : null}
      {onRemove ? (
        <RowAction label="🗑" onPress={() => onRemove(file)} tint={nativeLightTheme.text.muted} />
      ) : null}
    </View>
  )
}

function RowAction({
  label,
  onPress,
  tint,
}: {
  label: string
  onPress: () => void
  tint: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
      })}
    >
      <Text style={{ fontSize: 12, color: tint }}>{label}</Text>
    </Pressable>
  )
}
