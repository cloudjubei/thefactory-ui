import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { PARK_ANSWERS_COPY, type ParkAnswerView, type ParkAnswersView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export type ParkAnswersProps = {
  view: ParkAnswersView
  /** Put another answer in front. */
  onSelect: (key: string) => void
  /** Send an answer, with its words as the person left them. */
  onSend: (answer: ParkAnswerView, note: string | undefined) => void
  /** Answer in the person's own words — offered when the stop takes words. */
  onOwnAnswer?: () => void
  /** What the answer in front needs beside its button — how a retry starts. */
  leadExtra?: ReactNode
  busy?: boolean
}

/**
 * Native peer of
 * [web's `ParkAnswers`](../../../web/compound/process/ParkAnswers.tsx).
 * A stop's answers, the one in front shown whole: its name (and "Manager's
 * pick"), what it does, why, and the words it sends — sent as they are, or
 * edited first. The other answers are one tap away under "Or:"; carrying on
 * unchecked and the endings are quiet links under "Also:", and an ending asks
 * before it goes.
 */
export default function ParkAnswers({
  view,
  onSelect,
  onSend,
  onOwnAnswer,
  leadExtra,
  busy = false,
}: ParkAnswersProps) {
  const { theme, status } = useNativeTheme()
  const lead = view.lead
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(lead?.note ?? '')
  const [confirming, setConfirming] = useState<ParkAnswerView | undefined>()
  useEffect(() => {
    setEditing(false)
    setDraft(lead?.note ?? '')
  }, [lead?.key, lead?.note])
  if (!lead) return null

  const send = (answer: ParkAnswerView, note: string | undefined) =>
    answer.confirm ? setConfirming(answer) : onSend(answer, note)
  const leadNote = editing ? draft.trim() || undefined : lead.note
  const caption = {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.text.muted,
  } as const

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...caption, fontSize: 11 }}>
        {view.fromManager ? PARK_ANSWERS_COPY.heading : PARK_ANSWERS_COPY.headingPlain}
      </Text>
      <View
        style={{
          gap: nativeSpace[2],
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: theme.accent.softBorder,
          backgroundColor: theme.surface.raised,
          paddingHorizontal: 14,
          paddingVertical: nativeSpace[3],
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '600', color: theme.text.primary }}>
            {lead.label}
          </Text>
          {lead.pick && view.fromManager ? <PickTag /> : null}
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 17, color: theme.text.secondary }}>
          {lead.does}
        </Text>
        {lead.why ? (
          <Text style={{ fontSize: 12.5, lineHeight: 17, color: theme.text.muted }}>
            {lead.why}
          </Text>
        ) : null}
        {lead.note ? (
          <View style={{ gap: 4 }}>
            <Text style={caption}>{lead.noteLabel}</Text>
            {editing ? (
              <Textarea
                accessibilityLabel={lead.noteLabel}
                rows={4}
                value={draft}
                onChangeText={setDraft}
              />
            ) : (
              <View
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: theme.accent.softBorder,
                  borderTopRightRadius: nativeRadii[2],
                  borderBottomRightRadius: nativeRadii[2],
                  backgroundColor: theme.surface.base,
                  paddingHorizontal: 10,
                  paddingVertical: nativeSpace[2],
                }}
              >
                <Text style={{ fontSize: 13, lineHeight: 19, color: theme.text.primary }}>
                  {lead.note}
                </Text>
              </View>
            )}
          </View>
        ) : null}
        {leadExtra}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Button
            size="sm"
            variant={lead.confirm ? 'danger' : 'primary'}
            disabled={busy}
            onPress={() => send(lead, leadNote)}
          >
            {lead.note ? PARK_ANSWERS_COPY.send : lead.label}
          </Button>
          {lead.note ? (
            <Button size="sm" variant="ghost" disabled={busy} onPress={() => setEditing((v) => !v)}>
              {editing ? PARK_ANSWERS_COPY.cancel : PARK_ANSWERS_COPY.editFirst}
            </Button>
          ) : null}
        </View>
      </View>

      {view.others.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12.5, color: theme.text.muted }}>{PARK_ANSWERS_COPY.or}</Text>
          {view.others.map((answer) => (
            <Button
              key={answer.key}
              size="sm"
              variant="secondary"
              disabled={busy}
              accessibilityHint={answer.does}
              onPress={() => onSelect(answer.key)}
            >
              {answer.label}
            </Button>
          ))}
        </View>
      ) : null}

      {confirming ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: status.stuck.softBorder,
            backgroundColor: status.stuck.softBg,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: 10,
          }}
        >
          <Text style={{ flexBasis: '100%', fontSize: 13, color: status.stuck.softFg }}>
            {confirming.confirm?.text}
          </Text>
          <Button size="sm" variant="secondary" onPress={() => setConfirming(undefined)}>
            {PARK_ANSWERS_COPY.cancel}
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onPress={() => {
              setConfirming(undefined)
              onSend(confirming, undefined)
            }}
          >
            {confirming.confirm?.label}
          </Button>
        </View>
      ) : view.minor.length > 0 || onOwnAnswer ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 10,
            rowGap: 4,
          }}
        >
          {view.minor.length > 0 ? (
            <Text style={{ fontSize: 12.5, color: theme.text.muted }}>
              {PARK_ANSWERS_COPY.also}
            </Text>
          ) : null}
          {view.minor.map((answer) => (
            <QuietLink
              key={answer.key}
              label={answer.label}
              hint={answer.does}
              color={answer.confirm ? status.stuck.softFg : theme.accent.primary}
              disabled={busy}
              onPress={() => send(answer, answer.note)}
            />
          ))}
          {view.minor.length > 0 && onOwnAnswer ? (
            <Text accessibilityElementsHidden style={{ fontSize: 12.5, color: theme.text.muted }}>
              ·
            </Text>
          ) : null}
          {onOwnAnswer ? (
            <QuietLink
              label={PARK_ANSWERS_COPY.ownAnswer}
              color={theme.accent.primary}
              disabled={busy}
              onPress={onOwnAnswer}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/** An answer offered as a link rather than a button. */
function QuietLink({
  label,
  hint,
  color,
  disabled,
  onPress,
}: {
  label: string
  hint?: string
  color: string
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      {...(hint ? { accessibilityHint: hint } : {})}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
    >
      {({ pressed }) => (
        <Text
          style={{
            fontSize: 12.5,
            fontWeight: '500',
            color,
            opacity: disabled ? 0.5 : 1,
            textDecorationLine: pressed ? 'underline' : 'none',
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

function PickTag() {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.accent.softBorder,
        backgroundColor: theme.accent.softBg,
        paddingHorizontal: 8,
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 10.5, fontWeight: '600', color: theme.accent.softFg }}>
        {PARK_ANSWERS_COPY.pick}
      </Text>
    </View>
  )
}
