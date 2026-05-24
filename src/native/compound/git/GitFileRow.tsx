import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { countPatchAddDel } from 'thefactory-tools/utils'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'
import {
  IconDotsVertical,
  IconFileAdded,
  IconFileDeleted,
  IconFileModified,
  IconWarningTriangle,
} from '../../icons'
import IconButton from '../../primitives/IconButton'
import ActionMenu, { type ActionMenuItem } from '../ActionMenu'
import { PathDisplay } from '../PathDisplay'

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

const ICON_TINT: Record<string, string> = {
  A: '#15803d',
  M: '#b45309',
  D: '#b91c1c',
  R: '#1d4ed8',
  C: '#1d4ed8',
  T: '#b45309',
  U: '#b91c1c',
  '?': '#6b7280',
  '!': '#6b7280',
  X: '#6b7280',
}

function StatusIcon({ status, isConflicted }: { status?: string; isConflicted?: boolean }) {
  if (isConflicted) {
    return <IconWarningTriangle size={16} color="#dc2626" />
  }
  if (status === 'A') return <IconFileAdded size={16} color={ICON_TINT.A} />
  if (status === 'D') return <IconFileDeleted size={16} color={ICON_TINT.D} />
  return <IconFileModified size={16} color={status ? (ICON_TINT[status] ?? ICON_TINT.X) : ICON_TINT.X} />
}

function ChangesPills({ patch }: { patch?: string }) {
  const { add, del } = useMemo(() => countPatchAddDel(patch), [patch])
  if (add === 0 && del === 0) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {add > 0 ? (
        <View
          style={{
            paddingHorizontal: 5,
            paddingVertical: 1,
            borderRadius: 999,
            backgroundColor: 'rgba(34,197,94,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(34,197,94,0.25)',
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'Menlo', color: '#15803d' }}>+{add}</Text>
        </View>
      ) : null}
      {del > 0 ? (
        <View
          style={{
            paddingHorizontal: 5,
            paddingVertical: 1,
            borderRadius: 999,
            backgroundColor: 'rgba(239,68,68,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.25)',
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'Menlo', color: '#b91c1c' }}>−{del}</Text>
        </View>
      ) : null}
    </View>
  )
}

/**
 * Native peer of web's `GitFileRow` — one file in a Git changes list. Touch
 * has no hover, so the reset / remove / resolve actions live behind a
 * trailing `⋮` overflow menu (web small-screen uses the same pattern). The
 * status icon, `PathDisplay` (muted dir + bold filename), and `+N/−N` pills
 * match the web peer exactly.
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
  const [menuOpen, setMenuOpen] = useState(false)

  const actions: ActionMenuItem[] = []
  if (file.isConflicted && onResolveConflict) {
    actions.push({
      key: 'resolve',
      label: 'Resolve conflict',
      icon: <IconWarningTriangle size={20} color="#b45309" />,
      onPress: () => {
        setMenuOpen(false)
        onResolveConflict(file)
      },
    })
  }
  if (onReset) {
    actions.push({
      key: 'reset',
      label: 'Discard local changes',
      icon: <IconFileModified size={20} color="#dc2626" />,
      destructive: true,
      onPress: () => {
        setMenuOpen(false)
        onReset(file)
      },
    })
  }
  if (onRemove) {
    actions.push({
      key: 'remove',
      label: 'Delete file',
      icon: <IconFileDeleted size={20} color="#dc2626" />,
      destructive: true,
      onPress: () => {
        setMenuOpen(false)
        onRemove(file)
      },
    })
  }
  const hasActions = actions.length > 0

  return (
    <>
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
              borderColor: checked
                ? nativeLightTheme.accent.primary
                : nativeLightTheme.border.strong,
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

        <View style={{ width: 20, alignItems: 'center', justifyContent: 'center' }}>
          <StatusIcon status={file.status} isConflicted={file.isConflicted} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onPress ? () => onPress(file) : undefined}
          disabled={!onPress}
          style={{ flex: 1, minWidth: 0 }}
        >
          <PathDisplay path={file.path} />
        </Pressable>

        <ChangesPills patch={file.patch} />

        {hasActions ? (
          <IconButton
            size="sm"
            onPress={() => setMenuOpen(true)}
            accessibilityLabel={`Actions for ${file.path}`}
            style={{ borderRadius: nativeRadii[2] }}
          >
            <IconDotsVertical size={16} color={nativeLightTheme.text.muted} />
          </IconButton>
        ) : null}
      </View>

      <ActionMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={file.path.split('/').pop() ?? file.path}
        actions={actions}
      />
    </>
  )
}
