import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { nativeLightTheme } from '../../../tokens/native'

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
export function FilePaneHeader({ name, path, size, info, actions }: FilePaneHeaderProps) {
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
        borderBottomColor: nativeLightTheme.border.subtle,
        backgroundColor: nativeLightTheme.surface.base,
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
            color: nativeLightTheme.text.primary,
          }}
        >
          {resolvedName}
        </Text>
        {typeof size === 'number' ? (
          <Text
            style={{
              fontSize: 12,
              color: nativeLightTheme.text.muted,
              flexShrink: 0,
            }}
          >
            {`· ${humanSize(size)}`}
          </Text>
        ) : null}
      </View>
      {actions ? (
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
