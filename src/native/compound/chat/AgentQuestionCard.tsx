import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import { IconChat } from '../../icons'
import { canSubmitAnswer } from '../../../headless/utils/agentQuestions'
import {
  QUESTION_ANSWER_PLACEHOLDER,
  QUESTION_CARD_SUBTITLE,
  QUESTION_CARD_TITLE,
  QUESTION_DECLINE_LABEL,
  QUESTION_SUBMIT_LABEL,
} from '../../../headless/utils/agentQuestionConstants'
import type { PendingQuestionGrant } from '../../../headless/utils/chatTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface AgentQuestionCardProps {
  /** The parked `askUser` action — its parsed question and its answer channel. */
  grant: PendingQuestionGrant
  /** Blocks answering while the host is busy (e.g. a send is in flight). */
  disabled?: boolean
}

function formatRaw(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Native peer of
 * [web's `AgentQuestionCard`](../../../web/compound/chat/AgentQuestionCard.tsx).
 * A mid-run question from the agent — answered with text, not approved.
 */
export default function AgentQuestionCard({ grant, disabled }: AgentQuestionCardProps) {
  const { theme } = useNativeTheme()
  const { question, context, options, raw } = grant.question
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the answer.')
      setBusy(false)
    }
  }

  const locked = busy || disabled === true

  return (
    <View
      style={{
        padding: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.accent.primary,
        backgroundColor: theme.surface.raised,
        gap: nativeSpace[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        <IconChat size={16} color={theme.accent.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
            {QUESTION_CARD_TITLE}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {QUESTION_CARD_SUBTITLE}
          </Text>
        </View>
      </View>

      <View style={{ gap: nativeSpace[1] }}>
        <Text selectable style={{ fontSize: 14, color: theme.text.primary }}>
          {question}
        </Text>
        {context ? (
          <Text selectable style={{ fontSize: 12, color: theme.text.secondary }}>
            {context}
          </Text>
        ) : null}
        {raw !== undefined ? (
          <ScrollView style={{ maxHeight: 140 }}>
            <Text
              selectable
              style={{ fontFamily: 'Courier', fontSize: 12, color: theme.text.secondary }}
            >
              {formatRaw(raw)}
            </Text>
          </ScrollView>
        ) : null}
      </View>

      {options && options.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {options.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={answer === option ? 'secondary' : 'outline'}
              disabled={locked}
              onPress={() => setAnswer(option)}
            >
              {option}
            </Button>
          ))}
        </View>
      ) : null}

      <Textarea
        rows={3}
        value={answer}
        onChangeText={setAnswer}
        placeholder={QUESTION_ANSWER_PLACEHOLDER}
        accessibilityLabel={question}
        disabled={locked}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: nativeSpace[2],
          flexWrap: 'wrap',
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          disabled={locked}
          onPress={() => void run(() => grant.decide('deny'))}
        >
          {QUESTION_DECLINE_LABEL}
        </Button>
        <Button
          size="sm"
          loading={busy}
          disabled={locked || !canSubmitAnswer(answer)}
          onPress={() => void run(() => grant.answer(answer))}
        >
          {QUESTION_SUBMIT_LABEL}
        </Button>
      </View>
    </View>
  )
}
