import { Pressable, Text, View } from 'react-native'

import type { ChatChangesMarkerView } from '../../../headless/utils/chatChangesDockTypes'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconFile } from '../../icons'
import RefChip from '../chips/RefChip'
import { AlreadyOnBaseLine } from './AlreadyOnBaseLine'
import { toneChip } from './signoff'

export type ChatChangesMarkerProps = {
  view: ChatChangesMarkerView
  /** Opens the turn's review. Without it the marker only says what changed. */
  onOpen?: () => void
}

/**
 * Native peer of web's `ChatChangesMarker`: the one line a chat turn leaves
 * where it changed files. The whole row opens the review — a phone's tap
 * target is the row, not its link.
 */
export function ChatChangesMarker({ view, onOpen }: ChatChangesMarkerProps) {
  const { theme, status } = useNativeTheme()
  if (view.kind === 'already') {
    return <AlreadyOnBaseLine text={view.text} {...(view.change ? { change: view.change } : {})} />
  }
  if (view.kind === 'notice') {
    return (
      <Text style={{ marginTop: 8, fontSize: 12, color: theme.text.secondary }}>{view.text}</Text>
    )
  }
  const tag = view.status ? toneChip(view.status.tone, theme, status) : undefined
  const open = view.action && onOpen ? onOpen : undefined
  return (
    <Pressable
      accessibilityRole={open ? 'button' : undefined}
      accessibilityLabel={view.action ? `${view.label}. ${view.action.label}` : view.label}
      onPress={open}
      disabled={!open}
      style={({ pressed }) => ({
        marginTop: 8,
        gap: 4,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border.default,
        paddingHorizontal: 10,
        paddingVertical: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <IconFile size={15} color={theme.text.secondary} />
        <Text style={{ fontSize: 13, color: theme.text.primary }}>{view.label}</Text>
        {view.branch ? <RefChip kind="branch" value={view.branch} /> : null}
        {view.status && tag ? (
          <View
            style={{
              borderRadius: nativeRadii.round,
              borderWidth: 1,
              borderColor: tag.border,
              backgroundColor: tag.bg,
              paddingHorizontal: 8,
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '500', color: tag.fg }}>
              {view.status.label}
            </Text>
          </View>
        ) : null}
        {view.action && open ? (
          <Text style={{ marginLeft: 'auto', fontSize: 13, color: theme.accent.primary }}>
            {view.action.label}
          </Text>
        ) : null}
      </View>
      {view.note ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.note}</Text>
      ) : null}
    </Pressable>
  )
}
