import type { ComponentType, ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import {
  IconBranch,
  IconChat,
  IconDelete,
  IconDownload,
  IconFile,
  IconGlobe,
  IconMerge,
  IconPackage,
  IconPlay,
  IconUpload,
  IconWrench,
} from '../../icons'
import RichText from '../files/RichText'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import type {
  ToolAskCardView,
  ToolAskDecidedLine,
  ToolAskIcon,
  ToolAskScopeOption,
} from '../../../headless/utils/toolAskCardTypes'
import type { PendingToolGrantDecision } from '../../../headless/utils/chatTypes'

const ICONS: Record<ToolAskIcon, ComponentType<{ size?: number; color?: string }>> = {
  git: IconBranch,
  merge: IconMerge,
  push: IconUpload,
  package: IconPackage,
  network: IconGlobe,
  fetch: IconDownload,
  message: IconChat,
  file: IconFile,
  delete: IconDelete,
  run: IconPlay,
  tool: IconWrench,
}

export type ToolAskCardProps = {
  view: ToolAskCardView
  /** The thing itself — the package, the message, the branches — shown, and pickable where it can change. */
  children?: ReactNode
  busy: boolean
  error?: string | null
  problem?: string
  /** False while what it acts on is still being read: the verb waits, with no problem to name. */
  ready?: boolean
  /** A control at the header's end, such as opening the card larger. */
  headerAction?: ReactNode
  /** How tall the card may grow before its middle scrolls. */
  maxHeight?: number
  onApprove: () => void
  onDeny: () => void
  onLater?: () => void
}

/**
 * Native peer of [web's `ToolAskCard`](../../../web/compound/chat/ToolAskCard.tsx):
 * the one card every tool that waits on the person shares.
 */
export default function ToolAskCard({
  view,
  children,
  busy,
  error,
  problem,
  ready = true,
  headerAction,
  maxHeight = 560,
  onApprove,
  onDeny,
  onLater,
}: ToolAskCardProps) {
  const { theme, status } = useNativeTheme()
  const Icon = ICONS[view.icon]
  const danger = view.tone === 'danger'
  const tone = danger ? status.blocked : status.review
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: danger ? status.blocked.softFg : theme.accent.primary,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
        maxHeight,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          backgroundColor: tone.softBg,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.surface.raised,
          }}
        >
          <Icon size={14} color={tone.softFg} />
        </View>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13, fontWeight: '600', color: tone.softFg }}
        >
          {view.ask}
        </Text>
        {view.tag ? <Text style={{ fontSize: 11.5, color: tone.softFg }}>{view.tag}</Text> : null}
        {headerAction}
      </View>
      <ScrollView contentContainerStyle={{ padding: nativeSpace[3], gap: nativeSpace[3] }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
          {view.headline}
        </Text>
        {view.why ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              {TOOL_ASK_COPY.why}
            </Text>
            <RichText text={view.why} textColor={theme.text.secondary} />
          </View>
        ) : null}
        {children}
        {view.consequence ? (
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: danger ? '600' : '400',
              color: danger ? status.blocked.softFg : theme.text.secondary,
            }}
          >
            {view.consequence}
          </Text>
        ) : null}
      </ScrollView>
      <View
        style={{
          gap: nativeSpace[2],
          padding: nativeSpace[3],
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
        }}
      >
        {problem ? (
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{problem}</Text>
        ) : null}
        {error ? <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Button
            size="sm"
            variant={danger ? 'danger' : 'primary'}
            onPress={onApprove}
            loading={busy}
            disabled={busy || !ready || problem !== undefined}
          >
            {view.verb}
          </Button>
          <Button size="sm" variant="secondary" onPress={onDeny} disabled={busy}>
            {TOOL_ASK_COPY.notNow}
          </Button>
          {onLater ? (
            <>
              <View style={{ flex: 1 }} />
              <Button size="sm" variant="ghost" onPress={onLater} disabled={busy}>
                {TOOL_ASK_COPY.later}
              </Button>
            </>
          ) : null}
        </View>
      </View>
    </View>
  )
}

/** How far an approval reaches: just this once, or always in a place — a radio. */
export function ToolAskScopeChoice({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly ToolAskScopeOption[]
  value: PendingToolGrantDecision
  onChange: (decision: PendingToolGrantDecision) => void
  disabled?: boolean
}) {
  const { theme, status } = useNativeTheme()
  if (options.length === 0) return null
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={TOOL_ASK_COPY.howLong}
      style={{
        borderWidth: 1,
        borderColor: theme.border.default,
        borderRadius: nativeRadii[2],
        overflow: 'hidden',
      }}
    >
      {options.map((option, i) => {
        const on = option.decision === value
        return (
          <Pressable
            key={option.decision}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: disabled === true }}
            disabled={disabled}
            onPress={() => onChange(option.decision)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: theme.border.subtle,
              backgroundColor: on ? status.review.softBg : theme.surface.raised,
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
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                {option.label}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{option.hint}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

/** A decided card, folded to one line. */
export function ToolAskDecidedRow({ line }: { line: ToolAskDecidedLine }) {
  const { theme, status } = useNativeTheme()
  const done = line.tone === 'done'
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? status.done.softBg : theme.surface.overlay,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: done ? status.done.softFg : theme.text.secondary,
          }}
        >
          {done ? '✓' : '–'}
        </Text>
      </View>
      <Text style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}>{line.text}</Text>
    </View>
  )
}
