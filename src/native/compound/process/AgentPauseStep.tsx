import { Text, View } from 'react-native'

import type { AgentPauseAction, AgentPauseStepView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck, IconPause } from '../../icons'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import InlineStopConfirm from '../chips/InlineStopConfirm'

/** Native peer of web's `AgentPauseMarker`: a pause in "Needs you", where the step's status would be. */
export function AgentPauseMarker() {
  const { status } = useNativeTheme()
  const tone = status.on_hold
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone.bg,
        borderWidth: 1.5,
        borderColor: tone.bg,
      }}
    >
      <IconPause size={10} color={tone.fg} />
    </View>
  )
}

export type AgentPausePanelProps = {
  view: AgentPauseStepView
  onDecide: (action: AgentPauseAction) => void
}

/**
 * Native peer of web's `AgentPausePanel`: why the step's agent paused, with
 * Resume, Retry step and Stop run asked again in place; what is happening once
 * one is chosen; or, briefly, that the agent came back by itself.
 */
export default function AgentPausePanel({ view, onDecide }: AgentPausePanelProps) {
  const { theme, status } = useNativeTheme()
  const strip = (tone: keyof typeof status) => ({
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: nativeSpace[2],
    borderRadius: nativeRadii[3],
    borderWidth: 1,
    borderColor: status[tone].softBorder,
    backgroundColor: status[tone].softBg,
    paddingHorizontal: nativeSpace[3],
    paddingVertical: nativeSpace[2],
  })
  if (view.kind === 'working') {
    return (
      <View accessibilityRole="progressbar" style={strip('running')}>
        <Spinner size={13} color={status.running.softFg} />
        <Text style={{ fontSize: 12.5, color: status.running.softFg }}>{view.text}</Text>
      </View>
    )
  }
  if (view.kind === 'cleared') {
    return (
      <View accessibilityLiveRegion="polite" style={strip('done')}>
        <IconCheck size={12} color={status.done.softFg} />
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.done.softFg }}>
          {view.title}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{view.text}</Text>
      </View>
    )
  }
  const tone = status.on_hold
  return (
    <View
      style={{
        gap: 6,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: tone.softBorder,
        backgroundColor: tone.softBg,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[3],
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: tone.softFg }}>{view.headline}</Text>
      <Text style={{ fontSize: 12.5, lineHeight: 18, color: theme.text.secondary }}>
        {view.body}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingTop: 4,
        }}
      >
        {view.buttons.map((button, at) => (
          <Button
            key={button.action}
            size="sm"
            variant={at === 0 ? 'primary' : 'secondary'}
            {...(button.title ? { accessibilityHint: button.title } : {})}
            onPress={() => onDecide(button.action)}
          >
            {button.label}
          </Button>
        ))}
        {view.stop ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
              marginLeft: 4,
            }}
          >
            <InlineStopConfirm
              ask={view.stop.ask}
              stop={view.stop.label}
              keep={view.stop.keep}
              label={view.stop.label}
              onStop={() => onDecide('stop')}
            />
          </View>
        ) : null}
      </View>
      {view.error ? (
        <Text accessibilityRole="alert" style={{ fontSize: 12.5, color: status.stuck.softFg }}>
          {view.error}
        </Text>
      ) : null}
    </View>
  )
}
