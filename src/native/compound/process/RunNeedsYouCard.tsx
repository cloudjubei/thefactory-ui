import { useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import {
  PARK_ANSWERS_COPY,
  PROCESS_MANAGER_FOUND_LABEL,
  PROCESS_MANAGER_TRIED_LABEL,
  type ProcessManagerEscalationView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChat } from '../../icons'
import { Button } from '../../primitives/Button'

export type RunNeedsYouCardProps = {
  /** The step it stopped at, as chips — a feature's reference, then the step. */
  where: ReactNode
  /** On hold for a stop, in review for a decision at a gate. */
  tone: 'on_hold' | 'review'
  /** Open the run's chat to ask the manager about it. */
  onAskManager?: () => void
  children: ReactNode
  /** Laid over the card's own style — the sign-off places it flush in its column. */
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer of
 * [web's `RunNeedsYouCard`](../../../web/compound/process/RunNeedsYouCard.tsx).
 * The one thing that needs the person, at the top of the run: where it
 * stopped, what happened, the manager's word on it and the answers to choose
 * from. Everything else on the page sits below it.
 */
export default function RunNeedsYouCard({
  where,
  tone,
  onAskManager,
  children,
  style,
}: RunNeedsYouCardProps) {
  const { theme, status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      accessibilityLabel={PARK_ANSWERS_COPY.needsYou}
      style={[
        {
          marginHorizontal: nativeSpace[3],
          marginTop: nativeSpace[3],
          gap: 10,
          borderRadius: nativeRadii[4],
          borderWidth: 1,
          borderColor: variant.softBorder,
          backgroundColor: variant.softBg,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: 14,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {where}
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
          {PARK_ANSWERS_COPY.needsYou}
        </Text>
        {onAskManager ? (
          <Button size="sm" variant="ghost" style={{ marginLeft: 'auto' }} onPress={onAskManager}>
            <IconChat size={14} color={theme.text.primary} />
            {PARK_ANSWERS_COPY.askManager}
          </Button>
        ) : null}
      </View>
      {children}
    </View>
  )
}

/**
 * The manager's word on a stop in one line — what it recommends — with "Why"
 * opening what it found and what it tried.
 */
export function ManagerLine({ view }: { view: ProcessManagerEscalationView }) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const moreTries = view.moreTries
  const triesTone = moreTries?.verdict === 'helps' ? status.done : status.stuck
  return (
    <View
      style={{
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        paddingTop: 10,
      }}
    >
      {moreTries ? (
        <View
          style={{
            gap: 2,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: triesTone.softBorder,
            backgroundColor: triesTone.softBg,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: triesTone.softFg }}>
            {PARK_ANSWERS_COPY.moreTries[moreTries.verdict]}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: theme.text.primary }}>
            {moreTries.why}
          </Text>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: 8,
          rowGap: 4,
        }}
      >
        <Text
          style={{
            fontSize: 10.5,
            fontWeight: '600',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {PARK_ANSWERS_COPY.manager}
        </Text>
        <Text
          style={{
            flexGrow: 1,
            flexShrink: 1,
            fontSize: 13,
            lineHeight: 18,
            color: theme.text.primary,
          }}
        >
          {view.recommendation}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          hitSlop={6}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.accent.primary }}>
            {open ? PARK_ANSWERS_COPY.hideWhy : PARK_ANSWERS_COPY.why}
          </Text>
        </Pressable>
      </View>
      {open ? (
        <View
          style={{
            gap: 6,
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: theme.text.secondary }}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>
              {`${PROCESS_MANAGER_FOUND_LABEL}: `}
            </Text>
            {view.found}
          </Text>
          {view.tried.length > 0 ? (
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
                {PROCESS_MANAGER_TRIED_LABEL}
              </Text>
              {view.tried.map((t) => (
                <Text
                  key={t}
                  style={{ fontSize: 12.5, lineHeight: 18, color: theme.text.secondary }}
                >
                  {`• ${t}`}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
