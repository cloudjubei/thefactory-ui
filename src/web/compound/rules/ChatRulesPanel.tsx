import { useMemo } from 'react'

import { useActionRules } from '../../../headless/hooks/useActionRules'
import { actionRuleRowView, chatActionRules } from '../../../headless/utils/actionRules'
import { CHAT_RULES_EMPTY } from '../../../headless/utils/actionRulesConstants'
import ActionRuleRow from './ActionRuleRow'

export type ChatRulesPanelProps = {
  /** The chat whose own rules to list — the key its asks are recorded under. */
  chatContextId: string
}

/** "Rules for this chat": the always-allow rules scoped to this chat alone, each removable here. */
export default function ChatRulesPanel({ chatContextId }: ChatRulesPanelProps) {
  const { rules, loading, error, remove } = useActionRules(chatContextId)
  const own = useMemo(() => chatActionRules(rules, chatContextId), [rules, chatContextId])
  const now = Date.now()

  return (
    <section className="flex flex-col gap-2" aria-label="Rules for this chat">
      <div>
        <div className="text-sm font-medium text-(--text-primary)">Rules for this chat</div>
        <p className="text-xs text-(--text-secondary)">
          Tool calls you chose to always allow in this chat. Rules for every chat are in Settings →
          Saved rules.
        </p>
      </div>
      {error ? <p className="text-xs text-(--color-red-600)">{error}</p> : null}
      {!loading && own.length === 0 ? (
        <p className="text-xs text-(--text-secondary)">{CHAT_RULES_EMPTY}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {own.map((rule) => (
            <ActionRuleRow
              key={rule.id}
              rule={rule}
              view={actionRuleRowView(rule, { now, inChat: true })}
              onRemove={remove}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
