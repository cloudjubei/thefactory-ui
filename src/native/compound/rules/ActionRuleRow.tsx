import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { removeActionRuleConfirm } from '../../../headless/utils/actionRules'
import type { ActionRuleRowView, ActionRuleView } from '../../../headless/utils/actionRulesTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconClose } from '../../icons'
import { Button } from '../../primitives/Button'

export type ActionRuleRowProps = {
  rule: ActionRuleView
  view: ActionRuleRowView
  onRemove: (ruleId: string) => Promise<void>
}

/** Native peer of web's `ActionRuleRow`: one rule, and ✕ to remove it, confirmed. */
export default function ActionRuleRow({ rule, view, onRemove }: ActionRuleRowProps) {
  const { theme } = useNativeTheme()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const meta = [view.where, view.signIn, view.made, view.lastUsed].filter(Boolean)

  return (
    <View
      style={{
        gap: nativeSpace[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.raised,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {view.title}
          </Text>
          {view.callSummary ? (
            <Text
              numberOfLines={2}
              style={{ fontSize: 11, fontFamily: 'Menlo', color: theme.text.secondary }}
            >
              {view.callSummary}
            </Text>
          ) : null}
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{meta.join(' · ')}</Text>
        </View>
        {confirming ? null : (
          <Pressable
            onPress={() => setConfirming(true)}
            accessibilityRole="button"
            accessibilityLabel={`Remove rule: ${view.title}`}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <IconClose size={14} color={theme.text.secondary} />
          </Pressable>
        )}
      </View>
      {confirming ? (
        <View style={{ gap: nativeSpace[2], paddingTop: nativeSpace[2] }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {removeActionRuleConfirm(rule)}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
            <Button variant="ghost" size="sm" onPress={() => setConfirming(false)} disabled={busy}>
              Keep
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              onPress={() => {
                setBusy(true)
                void onRemove(rule.id).finally(() => {
                  setBusy(false)
                  setConfirming(false)
                })
              }}
            >
              Remove
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  )
}
