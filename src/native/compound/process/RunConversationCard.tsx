import { Pressable, Text, View } from 'react-native'

import { RUN_CONVERSATION_COPY as COPY, type RunConversationView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Spinner from '../../primitives/Spinner'

export type RunConversationCardProps = {
  view: RunConversationView
  /** Push the run's chat, where the conversation is; without it the card only says where it stands. */
  onOpen?: (() => void) | undefined
}

/**
 * Native peer of web's `RunConversationCard`: the conversation of a run that
 * works in its own chat, as a row on the run's screen while it is due — its
 * step working, or an ask waiting for the person's answer, tinted as a
 * decision then. A press pushes the chat, where the ask is answered on its
 * own card.
 */
export default function RunConversationCard({ view, onOpen }: RunConversationCardProps) {
  const { theme, status } = useNativeTheme()
  const tone = status[view.state === 'asks' ? 'review' : 'running']
  const asks = view.state === 'asks'
  const body = (
    <>
      {view.state === 'working' ? (
        <Spinner size={12} />
      ) : (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone.bg }} />
      )}
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13 }}>
        <Text style={{ fontWeight: '600', color: theme.text.primary }}>{view.title}</Text>
        <Text style={{ color: theme.text.muted }}> · </Text>
        <Text
          style={{
            fontWeight: asks ? '500' : '400',
            color: asks ? theme.text.primary : theme.text.secondary,
          }}
        >
          {view.line}
        </Text>
      </Text>
      {onOpen ? (
        <Text
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            fontWeight: '500',
            color: theme.accent.primary,
          }}
        >
          {asks ? COPY.answer : COPY.open} ›
        </Text>
      ) : null}
    </>
  )
  const style = {
    marginHorizontal: nativeSpace[3],
    marginTop: nativeSpace[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: nativeSpace[2],
    borderRadius: nativeRadii[3],
    borderWidth: 1,
    borderColor: tone.softBorder,
    backgroundColor: tone.softBg,
    paddingHorizontal: nativeSpace[4],
    paddingVertical: nativeSpace[3],
  } as const
  const label = COPY.label(view.title, view.line)
  return onOpen ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={style} onPress={onOpen}>
      {body}
    </Pressable>
  ) : (
    <View accessibilityLabel={label} style={style}>
      {body}
    </View>
  )
}
