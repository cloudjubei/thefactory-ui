import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { IntraMode } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron } from '../../icons'
import ActionMenu, { type ActionMenuItem } from '../ActionMenu'
import { PathDisplay } from '../PathDisplay'

export type DiffOptionsToolbarProps = {
  filePath: string
  wrap: boolean
  onWrapChange: (next: boolean) => void
  ignoreWS: boolean
  onIgnoreWSChange: (next: boolean) => void
  intra: IntraMode
  onIntraChange: (next: IntraMode) => void
}

/**
 * Native peer of web's `DiffViewer` options strip — file-path row plus Wrap /
 * Ignore WS / Intra controls. Intra opens as a bottom-sheet `ActionMenu` for
 * touch menu UX. Screens layer their own rows (selection actions, etc.) around
 * this and own the `UnifiedDiff` body.
 */
export default function DiffOptionsToolbar({
  filePath,
  wrap,
  onWrapChange,
  ignoreWS,
  onIgnoreWSChange,
  intra,
  onIntraChange,
}: DiffOptionsToolbarProps) {
  const { theme } = useNativeTheme()
  const [intraPickerOpen, setIntraPickerOpen] = useState(false)

  return (
    <>
      <View
        style={{
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.muted,
        }}
      >
        <PathDisplay path={filePath} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.muted,
        }}
      >
        <ToggleChip label="Wrap" value={wrap} onChange={onWrapChange} />
        <View style={{ width: nativeSpace[3] }} />
        <ToggleChip label="Ignore WS" value={ignoreWS} onChange={onIgnoreWSChange} />
        <View style={{ width: nativeSpace[3] }} />
        <Pressable
          onPress={() => setIntraPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Intra-line highlighting"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: nativeSpace[2],
            paddingVertical: 3,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          <Text
            style={{ fontSize: 11, color: theme.text.secondary, marginRight: 4 }}
            numberOfLines={1}
          >
            Intra
          </Text>
          <Text
            style={{ fontSize: 11, fontWeight: '600', color: theme.text.primary, marginRight: 2 }}
            numberOfLines={1}
          >
            {intra}
          </Text>
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <IconChevron size={10} color={theme.text.muted} />
          </View>
        </Pressable>
      </View>

      <ActionMenu
        isOpen={intraPickerOpen}
        onClose={() => setIntraPickerOpen(false)}
        title="Intra-line highlighting"
        actions={(['none', 'word', 'char'] as IntraMode[]).map<ActionMenuItem>((mode) => ({
          key: mode,
          label: mode,
          description: intra === mode ? 'Current' : undefined,
          onPress: () => {
            onIntraChange(mode)
            setIntraPickerOpen(false)
          },
        }))}
      />
    </>
  )
}

function ToggleChip({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', alignItems: 'center' }}
      hitSlop={6}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: value ? theme.accent.primary : theme.border.strong,
          backgroundColor: value ? theme.accent.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 6,
        }}
      >
        {value ? <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>✓</Text> : null}
      </View>
      <Text style={{ fontSize: 11, color: theme.text.primary }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}
