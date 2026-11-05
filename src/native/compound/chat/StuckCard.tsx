import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { QUESTION_PARK_LABEL } from '../../../headless/utils/agentQuestionConstants'
import { useStuckCard } from '../../../headless/hooks/useStuckCard'
import { STUCK_CARD_COPY } from '../../../headless/utils/stuckCardConstants'
import type { StuckCardAnswer } from '../../../headless/utils/stuckCardTypes'
import type { PendingQuestionGrant } from '../../../headless/utils/chatTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChat } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import ReferenceTextarea from '../files/ReferenceTextarea'
import RichText from '../files/RichText'

/** `rows` — an answer a row, each saying what it does; `buttons` — one row of buttons; `folded` — buttons, the evidence behind a tap. */
export type StuckCardLayout = 'rows' | 'buttons' | 'folded'

export interface StuckCardProps {
  /** The parked question, carrying the evidence and its answer channel. */
  grant: PendingQuestionGrant
  /** Set it aside, still waiting: it folds to a "Still waiting" row. */
  onPark?: () => void
  /** The pager over several open asks, shown in the header. */
  pager?: ReactNode
  layout?: StuckCardLayout
}

function AnswerRow({
  answer,
  disabled,
  action,
  onPress,
}: {
  answer: StuckCardAnswer
  disabled: boolean
  action: string
  onPress: () => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
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
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {answer.label}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{answer.detail}</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent.primary }}>{action}</Text>
    </Pressable>
  )
}

/** Native peer of the web `StuckCard`: the same evidence, answers and asking before Stop. */
export default function StuckCard({ grant, onPark, pager, layout = 'rows' }: StuckCardProps) {
  const { theme, status } = useNativeTheme()
  const card = useStuckCard(grant)
  const [evidenceOpen, setEvidenceOpen] = useState(layout !== 'folded')
  const { view } = card
  if (!view) return null
  const [continueAnswer, hintAnswer, stopAnswer] = view.answers as [
    StuckCardAnswer,
    StuckCardAnswer,
    StuckCardAnswer,
  ]
  const locked = card.busy

  const hintBox = (
    <View style={{ gap: 8 }}>
      <ReferenceTextarea
        rows={2}
        value={card.hint}
        onChangeText={card.setHint}
        placeholder={STUCK_CARD_COPY.hintPlaceholder}
        disabled={locked}
        textInputProps={{ accessibilityLabel: hintAnswer.label }}
      />
      <View style={{ flexDirection: 'row' }}>
        <Button
          size="sm"
          loading={card.busy}
          disabled={locked || !card.canSendHint}
          onPress={card.sendHint}
        >
          {STUCK_CARD_COPY.hintSend}
        </Button>
      </View>
    </View>
  )
  const stopConfirm = (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: status.stuck.softBorder,
        backgroundColor: status.stuck.softBg,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: status.stuck.softFg }}>
        {STUCK_CARD_COPY.stopAsk}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{stopAnswer.detail}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        <Button size="sm" variant="danger" disabled={locked} onPress={card.sendStop}>
          {stopAnswer.label}
        </Button>
        <Button size="sm" variant="ghost" disabled={locked} onPress={card.keepWaiting}>
          {STUCK_CARD_COPY.keep}
        </Button>
      </View>
    </View>
  )

  return (
    <View
      style={{
        borderRadius: nativeRadii[3],
        borderWidth: 1.5,
        borderColor: status.stuck.softBorder,
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
          backgroundColor: status.stuck.softBg,
        }}
      >
        <IconChat size={16} color={status.stuck.softFg} />
        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: status.stuck.softFg }}>
          {view.title}
        </Text>
        {pager}
      </View>
      <View style={{ padding: nativeSpace[3], gap: nativeSpace[3] }}>
        <RichText text={view.question} textColor={theme.text.primary} />
        {view.context ? (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.context}</Text>
        ) : null}
        {card.stopAsked ? null : evidenceOpen ? (
          <View
            style={{
              gap: 4,
              padding: nativeSpace[2],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.overlay,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.muted }}>
              {STUCK_CARD_COPY.evidence}
            </Text>
            {view.evidence.map((line) => (
              <Text
                key={line}
                selectable
                style={{ fontFamily: 'Courier', fontSize: 12, color: theme.text.secondary }}
              >
                {line}
              </Text>
            ))}
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setEvidenceOpen(true)}>
            <Text style={{ fontSize: 12.5, color: theme.accent.primary }}>
              {STUCK_CARD_COPY.evidence}
            </Text>
          </Pressable>
        )}

        {card.stopAsked ? (
          stopConfirm
        ) : layout === 'rows' ? (
          <View style={{ gap: 6 }}>
            <AnswerRow
              answer={continueAnswer}
              action={STUCK_CARD_COPY.go}
              disabled={locked}
              onPress={card.sendContinue}
            />
            {card.hintOpen ? (
              hintBox
            ) : (
              <AnswerRow
                answer={hintAnswer}
                action={STUCK_CARD_COPY.hintOpen}
                disabled={locked}
                onPress={card.openHint}
              />
            )}
            <AnswerRow
              answer={stopAnswer}
              action={STUCK_CARD_COPY.stopOpen}
              disabled={locked}
              onPress={card.askStop}
            />
          </View>
        ) : (
          <View style={{ gap: nativeSpace[2] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Button size="sm" disabled={locked} onPress={card.sendContinue}>
                {continueAnswer.label}
              </Button>
              <Button size="sm" variant="secondary" disabled={locked} onPress={card.openHint}>
                {hintAnswer.label}
              </Button>
              <Button size="sm" variant="ghost" disabled={locked} onPress={card.askStop}>
                {stopAnswer.label}
              </Button>
            </View>
            {card.hintOpen ? hintBox : null}
          </View>
        )}

        {card.error ? <Alert variant="error">{card.error}</Alert> : null}

        {onPark && !card.stopAsked ? (
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
            <Button size="sm" variant="ghost" disabled={locked} onPress={onPark}>
              {QUESTION_PARK_LABEL}
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  )
}
