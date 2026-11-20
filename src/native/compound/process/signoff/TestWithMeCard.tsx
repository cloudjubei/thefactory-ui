import { useState, type ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import {
  launchAgentPickMetadata,
  TEST_SESSION_STOP_CONFIRM_COPY,
  useLaunchAgentPick,
  useTestSession,
  type LaunchModelChipSlot,
  type TestSessionDisplay,
  type TestSessionHelperRow,
  type TestSessionTone,
} from '../../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChat, IconExternalLink, IconPlay, IconStop, IconTestTube } from '../../../icons'
import { Button } from '../../../primitives/Button'
import { ConfirmDialog } from '../../../primitives/Modal'
import ToneBadge from '../../chips/ToneBadge'

export interface TestWithMeCardProps {
  /** The run at its sign-off; a leg of a group run shares its group's session. */
  runId: string
  /** The host's model chip, as every launch draws it: the agent the helper runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Open the helper's chat. */
  onOpenChat?: (chat: TestSessionHelperRow['chat']) => void
}

export interface TestWithMePanelProps {
  display: TestSessionDisplay
  onStart?: () => void
  /** Asked once the person confirmed: the panel itself never stops without asking. */
  onStop?: () => void
  /** Open the served app. */
  onOpen?: (href: string) => void
  /** Draw the stop confirmation open, for the showcase. */
  confirmingStop?: boolean
  /** The helper's model chip, drawn beside a start. */
  modelChip?: ReactNode
  onOpenChat?: (chat: TestSessionHelperRow['chat']) => void
}

/**
 * Native peer of web's `TestWithMeCard`: the app served from this work while the person tests,
 * its log's errors, warnings and the change's own lines, and the proof of what the change wrote.
 */
export default function TestWithMeCard({
  runId,
  renderModelChip,
  onOpenChat,
}: TestWithMeCardProps) {
  const { display, start, stop } = useTestSession(runId)
  const { pick, slot } = useLaunchAgentPick()
  if (!display) return null
  return (
    <TestWithMePanel
      display={display}
      onStart={() => void start(launchAgentPickMetadata(pick))}
      onStop={() => void stop()}
      onOpen={(href) => void Linking.openURL(href)}
      {...(renderModelChip ? { modelChip: renderModelChip(slot) } : {})}
      {...(onOpenChat ? { onOpenChat } : {})}
    />
  )
}

/** The block itself, from its laid-out view — what the connected card and the showcase both draw. */
export function TestWithMePanel({
  display,
  onStart,
  onStop,
  onOpen,
  confirmingStop,
  modelChip,
  onOpenChat,
}: TestWithMePanelProps) {
  const { theme, status } = useNativeTheme()
  const [confirming, setConfirming] = useState(!!confirmingStop)
  const toneColor = (tone: TestSessionTone): string =>
    tone === 'empty' ? theme.text.secondary : status[tone].softFg
  const { action } = display
  const press = () => {
    if (!action || action.busy) return
    if (action.kind === 'start') onStart?.()
    else setConfirming(true)
  }

  return (
    <View
      accessibilityLabel={display.title}
      style={{
        gap: nativeSpace[3],
        padding: nativeSpace[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[4],
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        <IconTestTube size={16} color={theme.text.secondary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
            {display.title}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontSize: 13, fontWeight: '500', color: toneColor(display.tone) }}
          >
            {display.headline}
          </Text>
          {display.detail ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{display.detail}</Text>
          ) : null}
        </View>
      </View>

      {display.open || action ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {display.picksAgent && modelChip ? modelChip : null}
          {action ? (
            <Button
              size="sm"
              variant={action.kind === 'start' ? 'primary' : 'secondary'}
              loading={action.busy}
              onPress={press}
            >
              {action.kind === 'start' ? (
                <IconPlay size={14} color={theme.text.inverted} />
              ) : (
                <IconStop size={14} color={theme.text.primary} />
              )}
              {action.label}
            </Button>
          ) : null}
          {display.open ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => display.open && onOpen?.(display.open.href)}
            >
              <IconExternalLink size={14} color={theme.text.primary} />
              {display.open.label}
            </Button>
          ) : null}
        </View>
      ) : null}

      {display.helper ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: toneColor(display.helper.tone) }}>
            {display.helper.label}
          </Text>
          {display.helper.detail ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {display.helper.detail}
            </Text>
          ) : null}
          {onOpenChat ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => display.helper && onOpenChat(display.helper.chat)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}
            >
              <IconChat size={14} color={theme.accent.primary} />
              <Text style={{ fontSize: 12, color: theme.accent.primary }}>
                {display.helper.openLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {display.error ? (
        <Text accessibilityRole="alert" style={{ fontSize: 12, color: status.stuck.softFg }}>
          {display.error}
        </Text>
      ) : null}

      {display.showsFindings ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            {display.counts.map((count) => (
              <ToneBadge
                key={count.key}
                tone={count.value > 0 ? count.tone : 'empty'}
                label={`${count.label} ${count.value}`}
              />
            ))}
          </View>

          <View style={{ gap: nativeSpace[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              {display.linesTitle}
            </Text>
            {display.lines.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{display.linesEmpty}</Text>
            ) : null}
            {display.linesHidden > 0 ? (
              <Text
                style={{ fontSize: 11.5, color: theme.text.muted }}
              >{`+${display.linesHidden}`}</Text>
            ) : null}
            {display.lines.map((line) => (
              <View key={line.key} style={{ gap: 1 }}>
                <Text style={{ fontSize: 11.5 }}>
                  <Text style={{ fontWeight: '600', color: toneColor(line.tone) }}>
                    {line.kindLabel}
                  </Text>
                  <Text style={{ color: theme.text.muted }}>{`  ${line.role}`}</Text>
                </Text>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontFamily: nativeFontFamilies.mono,
                    color: theme.text.secondary,
                  }}
                >
                  {line.text}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ gap: nativeSpace[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              {display.proofTitle}
            </Text>
            {display.proof.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{display.proofEmpty}</Text>
            ) : null}
            {display.proof.map((item) => (
              <View key={item.key} style={{ gap: 2, paddingVertical: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                  <ToneBadge tone="review" label={item.kindLabel} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      fontWeight: '500',
                      color: theme.text.primary,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{item.meta}</Text>
                {item.detail ? (
                  <Text
                    numberOfLines={3}
                    style={{
                      fontSize: 11.5,
                      fontFamily: nativeFontFamilies.mono,
                      color: theme.text.secondary,
                    }}
                  >
                    {item.detail}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => onStop?.()}
        title={TEST_SESSION_STOP_CONFIRM_COPY.title}
        description={TEST_SESSION_STOP_CONFIRM_COPY.body}
        confirmLabel={TEST_SESSION_STOP_CONFIRM_COPY.confirm}
        cancelLabel={TEST_SESSION_STOP_CONFIRM_COPY.cancel}
        destructive
      />
    </View>
  )
}
