import { Text, View } from 'react-native'

import { IconChat } from '../../icons'
import RichText from '../files/RichText'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import {
  QUESTION_AGENT_DECIDES_ANSWER,
  QUESTION_ANSWERED_BY,
} from '../../../headless/utils/agentQuestionConstants'
import type { AnsweredQuestionView } from '../../../headless/utils/agentQuestionTypes'

/** Native peer of [web's `AnsweredQuestionBubble`](../../../web/compound/chat/AnsweredQuestionBubble.tsx). */
export default function AnsweredQuestionBubble({ view }: { view: AnsweredQuestionView }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ alignItems: 'flex-end', gap: 4 }}>
      <View
        style={{
          maxWidth: '90%',
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[3],
          backgroundColor: theme.surface.raised,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
            backgroundColor: theme.surface.overlay,
          }}
        >
          <IconChat size={12} color={theme.text.secondary} />
          <View style={{ flexShrink: 1 }}>
            <RichText text={view.question} textColor={theme.text.secondary} />
          </View>
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <RichText
            text={view.answer ?? QUESTION_AGENT_DECIDES_ANSWER}
            textColor={theme.text.primary}
          />
        </View>
      </View>
      <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
        {QUESTION_ANSWERED_BY[view.by]}
      </Text>
    </View>
  )
}
