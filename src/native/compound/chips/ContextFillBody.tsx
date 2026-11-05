import { Text, View } from 'react-native'

import {
  CHAT_COMPACT_COPY,
  CHAT_CONTEXT_FILL_COPY,
  type ChatContextFillView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import InlineStopConfirm from './InlineStopConfirm'
import { useContextFillColors } from './contextFillColors'

export interface ContextFillBodyProps {
  view: ChatContextFillView
}

/** What the context chip opens on touch: the native peer of the web `ContextFillPanel`. */
export default function ContextFillBody({ view }: ContextFillBodyProps) {
  const { theme, status } = useNativeTheme()
  const colors = useContextFillColors()
  const { compact } = view
  const lineColor =
    compact?.line?.tone === 'failed'
      ? status.stuck.softFg
      : compact?.line?.tone === 'done'
        ? theme.text.primary
        : theme.text.secondary
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {view.percent !== undefined ? (
        <>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
            {CHAT_CONTEXT_FILL_COPY.full(view.label)}
          </Text>
          <View
            style={{
              height: 6,
              borderRadius: nativeRadii.round,
              overflow: 'hidden',
              backgroundColor: theme.surface.overlay,
            }}
          >
            <View
              style={{
                height: 6,
                width: `${view.percent}%`,
                borderRadius: nativeRadii.round,
                backgroundColor: colors[view.level],
              }}
            />
          </View>
        </>
      ) : null}
      <Text style={{ fontSize: 13, color: theme.text.secondary, fontVariant: ['tabular-nums'] }}>
        {view.tokens}
      </Text>
      {view.note ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.note}</Text>
      ) : null}
      {compact ? (
        <View
          style={{
            gap: nativeSpace[2],
            paddingTop: nativeSpace[3],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
            <Button variant="secondary" size="sm" disabled={compact.running} onPress={compact.run}>
              {compact.running ? CHAT_COMPACT_COPY.running : CHAT_COMPACT_COPY.action}
            </Button>
            {compact.running ? (
              <InlineStopConfirm
                ask={CHAT_COMPACT_COPY.stopAsk}
                stop={CHAT_COMPACT_COPY.stop}
                keep={CHAT_COMPACT_COPY.keep}
                label={CHAT_COMPACT_COPY.stopLabel}
                onStop={compact.stop}
              />
            ) : null}
          </View>
          {compact.line ? (
            <Text style={{ fontSize: 13, color: lineColor }}>{compact.line.text}</Text>
          ) : (
            <Text style={{ fontSize: 12, color: theme.text.muted }}>{CHAT_COMPACT_COPY.hint}</Text>
          )}
        </View>
      ) : null}
    </View>
  )
}
