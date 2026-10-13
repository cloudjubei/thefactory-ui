import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import RichText from '../files/RichText'
import ReferenceTextarea from '../files/ReferenceTextarea'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { IconChat, IconEdit } from '../../icons'
import { canSubmitAnswer } from '../../../headless/utils/agentQuestions'
import {
  QUESTION_ANSWER_PLACEHOLDER,
  QUESTION_CARD_TITLE,
  QUESTION_DECLINE_LABEL,
  QUESTION_MORE,
  QUESTION_OPTION_SEND,
  QUESTION_PARK_LABEL,
  QUESTION_SOMETHING_ELSE,
  QUESTION_SUBMIT_LABEL,
} from '../../../headless/utils/agentQuestionConstants'
import type { AgentQuestionOption } from '../../../headless/utils/agentQuestionTypes'
import type { PendingQuestionGrant } from '../../../headless/utils/chatTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import QuestionPicker, { AgentsPickPill } from './QuestionPicker'

export interface AgentQuestionCardProps {
  /** The parked `askUser` action — its parsed question and its answer channel. */
  grant: PendingQuestionGrant
  /** Blocks answering while the host is busy (e.g. a send is in flight). */
  disabled?: boolean
  /** Set the question aside, still waiting — it folds to a "Still waiting" row. */
  onPark?: () => void
  /** The pager over several open asks, shown in the header. */
  pager?: ReactNode
}

const LONG_CONTEXT = 180

function formatRaw(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

function OptionRow({
  option,
  disabled,
  onSend,
}: {
  option: AgentQuestionOption
  disabled: boolean
  onSend: () => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onSend}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.border.default,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.raised,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: theme.border.strong,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {option.label}
          </Text>
          {option.recommended ? <AgentsPickPill /> : null}
        </View>
        {option.detail ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{option.detail}</Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent.primary }}>
        {QUESTION_OPTION_SEND}
      </Text>
    </Pressable>
  )
}

/**
 * Native peer of
 * [web's `AgentQuestionCard`](../../../web/compound/chat/AgentQuestionCard.tsx):
 * a mid-run question taking the composer's place, its options one tap each.
 */
export default function AgentQuestionCard({
  grant,
  disabled,
  onPark,
  pager,
}: AgentQuestionCardProps) {
  const { theme, status } = useNativeTheme()
  const { question, context, options, answerKind, raw } = grant.question
  const [answer, setAnswer] = useState('')
  const [otherOpen, setOtherOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canonicalize = useCanonicalizeReferences()
  const asked = [question, context ?? '', ...(options ?? []).map((o) => o.label)].join('\n')

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
  const send = (text: string) => void run(() => grant.answer(canonicalize(text, asked)))

  const locked = busy || disabled === true
  const renderOption = (option: AgentQuestionOption) => (
    <OptionRow
      key={option.label}
      option={option}
      disabled={locked}
      onSend={() => send(option.label)}
    />
  )
  const longContext = context !== undefined && context.length > LONG_CONTEXT

  return (
    <View
      style={{
        borderRadius: nativeRadii[3],
        borderWidth: 1.5,
        borderColor: status.on_hold.softBorder,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          backgroundColor: status.on_hold.softBg,
        }}
      >
        <IconChat size={16} color={status.on_hold.softFg} />
        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: status.on_hold.softFg }}>
          {QUESTION_CARD_TITLE}
        </Text>
        {pager}
      </View>
      <View style={{ padding: nativeSpace[3], gap: nativeSpace[3] }}>
        <RichText text={question} textColor={theme.text.primary} />
        {context ? (
          <View style={{ gap: 2 }}>
            {longContext && !contextOpen ? (
              <>
                <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.secondary }}>
                  {context}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setContextOpen(true)}>
                  <Text style={{ fontSize: 12.5, color: theme.accent.primary }}>
                    {QUESTION_MORE}
                  </Text>
                </Pressable>
              </>
            ) : (
              <RichText text={context} textColor={theme.text.secondary} />
            )}
          </View>
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

        {answerKind ? (
          <QuestionPicker
            kind={answerKind}
            options={options}
            disabled={locked}
            onSend={send}
            renderOtherOptions={(others) => others.map(renderOption)}
          />
        ) : null}

        <View style={{ gap: 6 }}>
          {answerKind ? null : (options ?? []).map(renderOption)}
          {otherOpen ? (
            <View style={{ gap: 8 }}>
              <ReferenceTextarea
                rows={2}
                value={answer}
                onChangeText={setAnswer}
                placeholder={QUESTION_ANSWER_PLACEHOLDER}
                disabled={locked}
                textInputProps={{ accessibilityLabel: question }}
              />
              <View style={{ flexDirection: 'row' }}>
                <Button
                  size="sm"
                  loading={busy}
                  disabled={locked || !canSubmitAnswer(answer)}
                  onPress={() => send(answer)}
                >
                  {QUESTION_SUBMIT_LABEL}
                </Button>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={locked}
              onPress={() => setOtherOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.border.strong,
                borderRadius: nativeRadii[2],
              }}
            >
              <IconEdit size={14} color={theme.text.secondary} />
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                {QUESTION_SOMETHING_ELSE}
              </Text>
            </Pressable>
          )}
        </View>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: nativeSpace[2],
            paddingTop: nativeSpace[2],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
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
          {onPark ? (
            <Button size="sm" variant="ghost" disabled={locked} onPress={onPark}>
              {QUESTION_PARK_LABEL}
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  )
}
