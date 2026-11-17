import { useState } from 'react'
import { Pressable, Text, View, type ViewStyle } from 'react-native'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useChatFileChipLook } from '../../../headless/contexts/ChatFileChipLookContext'
import { chatFileKind, chatFileStem } from '../../../headless/utils/chatFileChip'
import type { ChatFileChipLook } from '../../../headless/utils/chatFileChipTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FileTypeIcon from '../files/FileTypeIcon'

export interface ChatFileChipProps {
  path: string
  /** Opens the file; without it the chip is only a label. */
  onOpen?: () => void
  /** Starts with its whole name shown, as after a long press, as a showcase state shows it. */
  defaultWholeName?: boolean
}

const SHAPE: Record<ChatFileChipLook, ViewStyle> = {
  pill: {
    height: 32,
    maxWidth: 260,
    gap: nativeSpace[3],
    paddingLeft: nativeSpace[4],
    paddingRight: nativeSpace[6],
    borderRadius: nativeRadii.round,
  },
  labelled: {
    height: 36,
    maxWidth: 300,
    gap: nativeSpace[4],
    paddingLeft: nativeSpace[4],
    paddingRight: nativeSpace[6],
    borderRadius: nativeRadii.round,
  },
  tile: {
    width: 232,
    gap: nativeSpace[5],
    padding: nativeSpace[4],
    paddingRight: nativeSpace[6],
    borderRadius: nativeRadii[4],
  },
}

/**
 * A file on a message, as a chip: its type's icon and its name, cut short to
 * fit; a long press shows the name whole. `pill` is one line, `labelled` puts
 * the type in place of the extension, `tile` is a small card with the type under the
 * name. Native mirror of web's `ChatFileChip`.
 */
export default function ChatFileChip({
  path,
  onOpen,
  defaultWholeName = false,
}: ChatFileChipProps) {
  const { theme } = useNativeTheme()
  const look = useChatFileChipLook()
  const [wholeName, setWholeName] = useState(defaultWholeName)
  const name = attachmentDisplayName(path)
  const kind = chatFileKind(path)
  const lines = wholeName ? {} : { numberOfLines: 1 }
  const wraps =
    wholeName && look !== 'tile'
      ? { height: undefined, minHeight: SHAPE[look].height, paddingVertical: nativeSpace[3] }
      : {}

  const body =
    look === 'tile' ? (
      <>
        <View
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: nativeRadii[3],
            backgroundColor: theme.surface.muted,
          }}
        >
          <FileTypeIcon path={name} size={24} />
        </View>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Text {...lines} style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
            {name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.muted }}>
            {kind.long}
          </Text>
        </View>
      </>
    ) : (
      <>
        <FileTypeIcon path={name} size={look === 'labelled' ? 18 : 16} />
        <Text {...lines} style={{ flexShrink: 1, fontSize: 12, color: theme.text.primary }}>
          {look === 'labelled' ? chatFileStem(name) : name}
        </Text>
        {look === 'labelled' ? (
          <>
            <View style={{ width: 1, height: 12, backgroundColor: theme.border.default }} />
            <Text style={{ fontSize: 12, color: theme.text.muted }}>{kind.short}</Text>
          </>
        ) : null}
      </>
    )

  const frame: ViewStyle = {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: theme.surface.raised,
    ...SHAPE[look],
    ...wraps,
  }

  return (
    <Pressable
      accessibilityRole={onOpen ? 'button' : undefined}
      accessibilityLabel={onOpen ? `Open ${name}` : name}
      {...(onOpen ? { onPress: onOpen } : {})}
      onLongPress={() => setWholeName((whole) => !whole)}
      style={({ pressed }) => [
        frame,
        pressed
          ? { backgroundColor: theme.surface.muted, borderColor: theme.border.default }
          : null,
      ]}
    >
      {body}
    </Pressable>
  )
}
