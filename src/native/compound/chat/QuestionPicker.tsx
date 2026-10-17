import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import {
  useContextPickerItems,
  useProcessPickerItems,
  type QuestionPickerItems,
} from '../../../headless/hooks/useQuestionPickerItems'
import {
  QUESTION_AGENTS_PICK,
  QUESTION_PICKER_EMPTY,
  QUESTION_PICKER_FILTER,
  QUESTION_PICKER_LIMIT,
  QUESTION_PICKER_LOADING,
  QUESTION_PICKER_VERB,
} from '../../../headless/utils/agentQuestionConstants'
import { filterPickerItems, unmatchedOptions } from '../../../headless/utils/questionPicker'
import type {
  AgentQuestionOption,
  QuestionPickerKind,
} from '../../../headless/utils/agentQuestionTypes'

export type QuestionPickerProps = {
  kind: QuestionPickerKind
  options: readonly AgentQuestionOption[] | undefined
  disabled: boolean
  onSend: (answer: string) => void
  renderOtherOptions: (options: AgentQuestionOption[]) => ReactNode
}

const MONO_KINDS: readonly QuestionPickerKind[] = ['branch', 'file']

/** The pill on the agent's own pick. */
export function AgentsPickPill() {
  const { status } = useNativeTheme()
  return (
    <View
      style={{
        paddingHorizontal: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: status.done.softBorder,
        backgroundColor: status.done.softBg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: status.done.softFg }}>
        {QUESTION_AGENTS_PICK}
      </Text>
    </View>
  )
}

function PickerList({
  kind,
  options,
  source,
  disabled,
  onSend,
  renderOtherOptions,
}: QuestionPickerProps & { source: QuestionPickerItems }) {
  const { theme } = useNativeTheme()
  const [query, setQuery] = useState('')
  const [chosenId, setChosenId] = useState<string>()
  const selectedId = chosenId ?? source.items.find((i) => i.recommended)?.id
  const shown = filterPickerItems(source.items, query, QUESTION_PICKER_LIMIT, selectedId)
  const selected = source.items.find((i) => i.id === selectedId)
  const others = unmatchedOptions(source.items, options)
  const mono = MONO_KINDS.includes(kind)
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.default,
          borderRadius: nativeRadii[2],
          overflow: 'hidden',
        }}
      >
        <View style={{ padding: 6, borderBottomWidth: 1, borderBottomColor: theme.border.subtle }}>
          <Input
            size="sm"
            value={query}
            disabled={disabled}
            onChangeText={setQuery}
            placeholder={QUESTION_PICKER_FILTER[kind](source.items.length)}
            accessibilityLabel={QUESTION_PICKER_FILTER[kind](source.items.length)}
          />
        </View>
        <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
          {shown.length === 0 ? (
            <Text style={{ padding: 12, fontSize: 12.5, color: theme.text.muted }}>
              {source.isLoaded ? QUESTION_PICKER_EMPTY : QUESTION_PICKER_LOADING}
            </Text>
          ) : (
            shown.map((item, i) => {
              const on = item.id === selectedId
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled }}
                  disabled={disabled}
                  onPress={() => setChosenId(item.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: theme.border.subtle,
                    backgroundColor: on ? theme.accent.softBg : theme.surface.raised,
                  }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: on ? theme.accent.primary : theme.border.strong,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.accent.primary,
                        }}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          {
                            flexShrink: 1,
                            fontSize: 12.5,
                            fontWeight: '600',
                            color: theme.text.primary,
                          },
                          mono ? { fontFamily: 'Menlo' } : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.recommended ? <AgentsPickPill /> : null}
                    </View>
                    {item.detail ? (
                      <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
                        {item.detail}
                      </Text>
                    ) : null}
                  </View>
                  {item.tag ? (
                    <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{item.tag}</Text>
                  ) : null}
                </Pressable>
              )
            })
          )}
        </ScrollView>
      </View>
      {others.length > 0 ? <View style={{ gap: 6 }}>{renderOtherOptions(others)}</View> : null}
      <View style={{ flexDirection: 'row' }}>
        <Button
          size="sm"
          disabled={disabled || !selected}
          onPress={() => selected && onSend(selected.answer)}
        >
          {QUESTION_PICKER_VERB[kind]}
        </Button>
      </View>
    </View>
  )
}

function ContextPicker(
  props: QuestionPickerProps & { kind: Exclude<QuestionPickerKind, 'process'> },
) {
  const source = useContextPickerItems(props.kind, props.options)
  return <PickerList {...props} source={source} />
}

function ProcessPicker(props: QuestionPickerProps) {
  const source = useProcessPickerItems(props.options)
  return <PickerList {...props} source={source} />
}

/** Native peer of [web's `QuestionPicker`](../../../web/compound/chat/QuestionPicker.tsx). */
export default function QuestionPicker(props: QuestionPickerProps) {
  return props.kind === 'process' ? (
    <ProcessPicker {...props} />
  ) : (
    <ContextPicker {...props} kind={props.kind} />
  )
}
