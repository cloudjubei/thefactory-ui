import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  AGENT_TYPE_NOT_PROVING_TAG,
  AGENT_TYPE_SLOT_NOTE,
  type AgentTypeOptionView,
  type AgentTypeSlotRowView,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type AgentTypeSlotChooserProps = {
  /** The slot as the card shows it: the type it runs, where that came from, and what else may run there. */
  row: AgentTypeSlotRowView
  busy?: boolean
  onChoose: (agentTypeId: string) => void
}

/** The tallest the type list grows in place before it scrolls. */
const LIST_MAX_HEIGHT = 280

/**
 * Native peer of [web's `AgentTypeSlotChooser`](../../../web/compound/chat/AgentTypeSlotChooser.tsx):
 * one chip naming the type a slot runs and where it came from; tapping it lists
 * every type of the matching role in place under it.
 */
export default function AgentTypeSlotChooser({
  row,
  busy = false,
  onChoose,
}: AgentTypeSlotChooserProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)

  const tag = (text: string) => (
    <Text
      style={{
        fontSize: 10,
        color: theme.text.secondary,
        borderWidth: 1,
        borderColor: theme.border.default,
        borderRadius: nativeRadii.round,
        paddingHorizontal: 6,
      }}
    >
      {text}
    </Text>
  )

  const optionRow = (option: AgentTypeOptionView, i: number) => {
    const selected = option.id === row.chosen.id
    return (
      <Pressable
        key={option.id}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={() => {
          onChoose(option.id)
          setOpen(false)
        }}
        style={{
          minHeight: 44,
          justifyContent: 'center',
          gap: 2,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderTopWidth: i > 0 ? 1 : 0,
          borderTopColor: theme.border.subtle,
          backgroundColor: selected ? theme.surface.muted : theme.surface.raised,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}
          >
            {option.label}
          </Text>
          {tag(option.scopeLabel)}
          {option.notProving ? tag(AGENT_TYPE_NOT_PROVING_TAG) : null}
        </View>
        {option.description ? (
          <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{option.description}</Text>
        ) : null}
      </Pressable>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: busy }}
        accessibilityLabel={`${row.slotLabel}: ${row.chosen.label}, ${row.sourceLabel}`}
        disabled={busy}
        onPress={() => setOpen((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          maxWidth: '100%',
          minHeight: 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          borderRadius: nativeRadii.round,
          borderWidth: row.changed ? 2 : 1,
          borderColor: theme.accent.primary,
          backgroundColor: theme.surface.raised,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{row.slotLabel}</Text>
        <Text
          numberOfLines={1}
          style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}
        >
          {row.chosen.label}
        </Text>
        <Text style={{ fontSize: 10.5, color: theme.text.muted }}>{row.sourceLabel}</Text>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={row.slotLabel}
          style={{
            borderWidth: 1,
            borderColor: theme.border.default,
            borderRadius: nativeRadii[3],
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled style={{ maxHeight: LIST_MAX_HEIGHT }}>
            {row.options.map(optionRow)}
          </ScrollView>
          <Text
            style={{
              fontSize: 10.5,
              color: theme.text.muted,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {AGENT_TYPE_SLOT_NOTE}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
