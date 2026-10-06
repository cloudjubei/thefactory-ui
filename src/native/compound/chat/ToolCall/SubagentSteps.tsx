import { memo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import Markdown from '../../Markdown'
import { IconChevron } from '../../../icons'
import type { ChatMessageLike } from '../../../../headless/utils/chatTypes'
import { describeSubagentSteps } from '../../../../headless/utils/cliRunActivity'
import { nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import type { NativeToolCallRenderArgs } from '../chatNativeTypes'

export type SubagentStepsProps = {
  messages: ChatMessageLike[]
  renderToolCall?: (args: NativeToolCallRenderArgs) => ReactNode
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  onResourceLink?: (link: ResourceLink) => void
}

/** What a subagent said and called, folded under the call that started it. */
function SubagentSteps({
  messages,
  renderToolCall,
  renderReference,
  onResourceLink,
}: SubagentStepsProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View
      style={{
        marginLeft: nativeSpace[4],
        paddingLeft: nativeSpace[3],
        borderLeftWidth: 1,
        borderLeftColor: theme.border.subtle,
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingVertical: nativeSpace[2],
        }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevron size={14} color={theme.text.secondary} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
          Subagent
        </Text>
        <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
          {describeSubagentSteps(messages)}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: nativeSpace[2], paddingBottom: nativeSpace[2] }}>
          {messages.map((m, i) =>
            m.role === 'tool' && m.toolCall ? (
              <View key={`${String(m.toolCall.toolCallId)}-${i}`} style={{ gap: nativeSpace[2] }}>
                {renderToolCall ? (
                  renderToolCall({
                    toolCall: m.toolCall,
                    result: m.toolResult?.result,
                    resultType: m.toolResult?.type,
                    durationMs: m.toolResult?.durationMs ?? m.durationMs,
                  })
                ) : (
                  <Text style={{ fontFamily: 'Menlo', fontSize: 12, color: theme.text.primary }}>
                    {m.toolCall.name}
                  </Text>
                )}
                {m.subagentMessages ? (
                  <SubagentStepsMemo
                    messages={m.subagentMessages}
                    renderToolCall={renderToolCall}
                    renderReference={renderReference}
                    onResourceLink={onResourceLink}
                  />
                ) : null}
              </View>
            ) : (
              <View key={`text-${i}`} style={{ paddingHorizontal: nativeSpace[2], opacity: 0.8 }}>
                <Markdown
                  text={m.content}
                  onResourceLink={onResourceLink}
                  renderReference={renderReference}
                  typedReferences
                />
              </View>
            ),
          )}
        </View>
      ) : null}
    </View>
  )
}

const SubagentStepsMemo = memo(SubagentSteps)
export default SubagentStepsMemo
