import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type RemoteBrowserBesideProps = {
  /** The browser: `RemoteBrowserView`. */
  browser: ReactNode
  /** The chat beside it; on a phone, what stays under the page: staged notes and composer. */
  chat: ReactNode
  /** A phone: the page takes the screen and the chat folds to a sheet under it. */
  compact?: boolean
  chatTitle?: string
  /** Beside the name: `3 messages`. */
  chatMeta?: string
}

/** Native peer of web's `RemoteBrowserBeside`: the page beside the chat, or over it on a phone. */
export default function RemoteBrowserBeside({
  browser,
  chat,
  compact = true,
  chatTitle,
  chatMeta,
}: RemoteBrowserBesideProps) {
  const { theme } = useNativeTheme()
  if (!compact)
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.surface.base }}>
        <View style={{ flex: 1, minWidth: 0 }}>{browser}</View>
        <View
          style={{
            width: 400,
            maxWidth: '45%',
            borderLeftWidth: 1,
            borderLeftColor: theme.border.subtle,
          }}
        >
          {chat}
        </View>
      </View>
    )
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
      <View style={{ flex: 1, minHeight: 0 }}>{browser}</View>
      <View
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -6 },
          elevation: 8,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: nativeSpace[2], paddingBottom: 2 }}>
          <View
            style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border.default }}
          />
        </View>
        {chatTitle ? (
          <View
            style={{
              flexDirection: 'row',
              gap: nativeSpace[2],
              paddingHorizontal: 14,
              paddingTop: 2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
              {chatTitle}
            </Text>
            {chatMeta ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>· {chatMeta}</Text>
            ) : null}
          </View>
        ) : null}
        {chat}
      </View>
    </View>
  )
}
