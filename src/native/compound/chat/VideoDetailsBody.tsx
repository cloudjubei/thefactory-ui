import { Text, View } from 'react-native'

import { VIDEO_ATTACHMENT_TEXT, type VideoAttachmentView, type VideoStep } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck } from '../../icons'
import Spinner from '../../primitives/Spinner'

export interface VideoDetailsBodyProps {
  view: VideoAttachmentView
}

function StepMark({ step }: { step: VideoStep }) {
  const { theme } = useNativeTheme()
  if (step.state === 'done') return <IconCheck size={14} color="#10b981" />
  if (step.state === 'active') return <Spinner size={12} />
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.5,
        backgroundColor: theme.text.muted,
      }}
    />
  )
}

/** How a video stands: what its chip opens in a sheet, as the web shows it in a popover. */
export default function VideoDetailsBody({ view }: VideoDetailsBodyProps) {
  const { theme } = useNativeTheme()
  const { facts, steps, state, line, cost, transcript } = view
  const body = { fontSize: 13, color: theme.text.secondary }
  const divider = {
    gap: 2,
    paddingTop: nativeSpace[3],
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  }
  return (
    <View
      style={{
        gap: nativeSpace[3],
        paddingHorizontal: nativeSpace[4],
        paddingBottom: nativeSpace[5],
      }}
    >
      {facts ? (
        <Text style={{ ...body, color: theme.text.muted, fontVariant: ['tabular-nums'] }}>
          {facts}
        </Text>
      ) : null}
      {steps.length > 0 ? (
        <View style={{ gap: nativeSpace[1] }}>
          {steps.map((step) => (
            <View
              key={step.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}
            >
              <View
                style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <StepMark step={step} />
              </View>
              <Text
                style={{
                  ...body,
                  ...(step.state === 'active'
                    ? { color: theme.text.primary, fontWeight: '500' as const }
                    : step.state === 'todo'
                      ? { color: theme.text.muted }
                      : {}),
                }}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {state === 'failed' && line ? (
        <Text style={{ ...body, color: theme.text.primary }}>{line}</Text>
      ) : null}
      {cost ? (
        <View style={divider}>
          <Text style={{ ...body, color: theme.text.primary, fontWeight: '500' }}>{cost.read}</Text>
          <Text style={{ ...body, color: theme.text.primary, fontWeight: '500' }}>
            {cost.closer}
          </Text>
          <Text style={{ ...body, color: theme.text.muted }}>{VIDEO_ATTACHMENT_TEXT.costNote}</Text>
        </View>
      ) : state === 'preparing' ? (
        <View style={divider}>
          <Text style={{ ...body, color: theme.text.muted }}>
            {VIDEO_ATTACHMENT_TEXT.costLater}
          </Text>
        </View>
      ) : null}
      {transcript ? (
        <Text style={{ ...body, color: theme.text.muted }}>{transcript.long}</Text>
      ) : null}
    </View>
  )
}
