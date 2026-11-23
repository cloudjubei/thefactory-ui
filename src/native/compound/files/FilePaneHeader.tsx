import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { useIncomingFileToast } from '../../../headless/hooks/useIncomingFileToast'
import {
  PENDING_FILE_CHANGE_LABEL,
  type PendingFileChange,
  type PendingFileChangeActions,
} from '../../../headless/utils/pendingFileChange'
import { IconWarningTriangle } from '../../icons/IconWarningTriangle'
import { useToast } from '../../primitives/Toast'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { PendingFileChangeCallout } from './PendingFileChangeCallout'

export type FilePaneHeaderProps = {
  /** Basename (e.g. `Foo.tsx`). Falls back to last `/`-segment of `path`. */
  name?: string
  /** Project-relative path. */
  path?: string
  /** Size in bytes; rendered as a `· <human-size>` suffix on the name. */
  size?: number | null
  /** Left-of-name slot — typically a small info button. */
  info?: ReactNode
  /** Right-side action slot (icon buttons such as copy / save / rename / delete). */
  actions?: ReactNode
  /** Pending disk change for the dirty editor, if any. */
  pendingChange?: PendingFileChange['kind'] | PendingFileChange
  pendingChangeActions?: PendingFileChangeActions
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  const gb = mb / 1024
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`
}

/**
 * Native peer of [web's `FilePaneHeader`](../../../web/compound/files/FilePaneHeader.tsx).
 * A fixed-height (44 px) bordered row showing the filename in monospace plus
 * an optional human-readable size, with a right-side row for icon actions
 * supplied by the host (Copy / Save / pane toggle / Rename / Delete).
 */
export function FilePaneHeader({
  name,
  path,
  size,
  info,
  actions,
  pendingChange,
  pendingChangeActions,
}: FilePaneHeaderProps) {
  const { theme, status } = useNativeTheme()
  const { toast } = useToast()
  const pendingKind = typeof pendingChange === 'string' ? pendingChange : pendingChange?.kind
  useIncomingFileToast(path, pendingKind, toast)
  const pendingColor = {
    clean: status.done.softFg,
    conflict: status.review.softFg,
    deleted: status.stuck.softFg,
  }
  const resolvedName = name ?? (path ? path.split('/').pop() : undefined) ?? ''
  return (
    <View
      accessibilityRole="header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        height: 44,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}
      >
        {info ? <View>{info}</View> : null}
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={{
            flexShrink: 1,
            fontFamily: 'Menlo',
            fontSize: 12,
            fontWeight: '500',
            color: theme.text.primary,
          }}
        >
          {resolvedName}
        </Text>
        {typeof size === 'number' ? (
          <Text
            style={{
              fontSize: 12,
              color: theme.text.muted,
              flexShrink: 0,
            }}
          >
            {`· ${humanSize(size)}`}
          </Text>
        ) : null}
      </View>
      {typeof pendingChange === 'object' ? (
        <PendingFileChangeCallout
          key={path}
          change={pendingChange}
          color={pendingColor[pendingChange.kind]}
          actions={pendingChangeActions}
        />
      ) : pendingChange ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={PENDING_FILE_CHANGE_LABEL[pendingChange]}
        >
          <IconWarningTriangle size={20} strokeColor={pendingColor[pendingChange]} />
        </View>
      ) : null}
      {actions || pendingChange ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            height: '100%',
          }}
        >
          {actions}
        </View>
      ) : null}
    </View>
  )
}

export default FilePaneHeader
