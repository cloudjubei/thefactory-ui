import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { useActionRules } from '../../../headless/hooks/useActionRules'
import { actionRuleRowView, chatActionRules } from '../../../headless/utils/actionRules'
import { CHAT_RULES_EMPTY } from '../../../headless/utils/actionRulesConstants'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ActionRuleRow from './ActionRuleRow'

export type ChatRulesPanelProps = {
  /** The chat whose own rules to list — the key its asks are recorded under. */
  chatContextId: string
}

/** Native peer of web's `ChatRulesPanel`: this chat's own always-allow rules, removable here. */
export default function ChatRulesPanel({ chatContextId }: ChatRulesPanelProps) {
  const { theme } = useNativeTheme()
  const { rules, loading, error, remove } = useActionRules(chatContextId)
  const own = useMemo(() => chatActionRules(rules, chatContextId), [rules, chatContextId])
  const now = Date.now()

  return (
    <View style={{ gap: nativeSpace[2] }} accessibilityLabel="Rules for this chat">
      <View>
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          Rules for this chat
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
          Tool calls you chose to always allow in this chat. Rules for every chat are in Settings →
          Saved rules.
        </Text>
      </View>
      {error ? <Text style={{ fontSize: 12, color: '#dc2626' }}>{error}</Text> : null}
      {!loading && own.length === 0 ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{CHAT_RULES_EMPTY}</Text>
      ) : (
        own.map((rule) => (
          <ActionRuleRow
            key={rule.id}
            rule={rule}
            view={actionRuleRowView(rule, { now, inChat: true })}
            onRemove={remove}
          />
        ))
      )}
    </View>
  )
}
