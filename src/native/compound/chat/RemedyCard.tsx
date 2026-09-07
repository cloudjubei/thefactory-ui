import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import { IconToolbox } from '../../icons'
import type { PendingRemedyGrant } from '../../../headless/utils/chatTypes'
import type { AgentRemedyOption } from '../../../headless/utils/agentRemedyTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface RemedyCardProps {
  /** The parked remedy — its parsed request and its resolve/dismiss channels. */
  grant: PendingRemedyGrant
  /** Blocks resolving while the host is busy. */
  disabled?: boolean
}

function formatRaw(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Native peer of [web's `RemedyCard`](../../../web/compound/chat/RemedyCard.tsx).
 * A mid-run blocker a remediable tool raised — resolved by choosing a hint,
 * dispatching an agent, or fixing it by hand, never Allow/Deny.
 */
export default function RemedyCard({ grant, disabled }: RemedyCardProps) {
  const { theme } = useNativeTheme()
  const { tool, summary, detail, attempted, remedies, raw } = grant.remedy
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [custom, setCustom] = useState<Record<string, string>>({})

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve the blocker.')
      setBusy(false)
    }
  }

  const locked = busy || disabled === true

  const renderOption = (option: AgentRemedyOption) => {
    if (option.kind === 'hint') {
      return (
        <View
          key={option.id}
          style={{
            gap: nativeSpace[2],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            paddingTop: nativeSpace[2],
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
            {option.label}
          </Text>
          {option.suggestions && option.suggestions.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
              {option.suggestions.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onPress={() => void run(() => grant.resolveRemedy(option.id, s))}
                >
                  {s}
                </Button>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: nativeSpace[2] }}>
            <View style={{ flex: 1 }}>
              <Textarea
                rows={1}
                value={custom[option.id] ?? ''}
                onChangeText={(t: string) => setCustom((p) => ({ ...p, [option.id]: t }))}
                placeholder={option.param ? `Value for ${option.param}…` : 'Value…'}
                accessibilityLabel={option.label}
                disabled={locked}
              />
            </View>
            <Button
              size="sm"
              disabled={locked || !custom[option.id]?.trim()}
              onPress={() => void run(() => grant.resolveRemedy(option.id, custom[option.id]))}
            >
              Apply
            </Button>
          </View>
        </View>
      )
    }
    return (
      <View
        key={option.id}
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          paddingTop: nativeSpace[2],
        }}
      >
        <Button
          size="sm"
          variant={option.kind === 'agent' ? 'secondary' : 'outline'}
          disabled={locked}
          onPress={() => void run(() => grant.resolveRemedy(option.id))}
        >
          {option.label}
        </Button>
      </View>
    )
  }

  return (
    <View
      style={{
        padding: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.accent.primary,
        backgroundColor: theme.surface.raised,
        gap: nativeSpace[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        <IconToolbox size={16} color={theme.accent.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
            A tool is blocked
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {tool} can’t continue — choose how to unblock it.
          </Text>
        </View>
      </View>

      <View style={{ gap: nativeSpace[1] }}>
        <Text selectable style={{ fontSize: 14, color: theme.text.primary }}>
          {summary}
        </Text>
        {detail ? (
          <Text selectable style={{ fontSize: 12, color: theme.text.secondary }}>
            {detail}
          </Text>
        ) : null}
        {attempted && attempted.length > 0 ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Already tried: {attempted.join('; ')}.
          </Text>
        ) : null}
        {raw !== undefined ? (
          <ScrollView style={{ maxHeight: 140 }}>
            <Text
              selectable
              style={{ fontFamily: 'Courier', fontSize: 12, color: theme.text.secondary }}
            >
              {formatRaw(raw)}
            </Text>
          </ScrollView>
        ) : null}
      </View>

      <View style={{ gap: nativeSpace[2] }}>{remedies.map(renderOption)}</View>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button
          size="sm"
          variant="ghost"
          disabled={locked}
          onPress={() => void run(() => grant.dismissRemedy())}
        >
          Dismiss
        </Button>
      </View>
    </View>
  )
}
