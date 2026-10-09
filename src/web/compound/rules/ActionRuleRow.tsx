import { useState } from 'react'

import { removeActionRuleConfirm } from '../../../headless/utils/actionRules'
import type { ActionRuleRowView, ActionRuleView } from '../../../headless/utils/actionRulesTypes'
import { IconClose } from '../../icons'
import { Button } from '../../primitives/Button'

export type ActionRuleRowProps = {
  rule: ActionRuleView
  view: ActionRuleRowView
  onRemove: (ruleId: string) => Promise<void>
}

/** One "always allow" rule: what it allows, where, its sign-in and use — and ✕ to remove it, confirmed. */
export default function ActionRuleRow({ rule, view, onRemove }: ActionRuleRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const meta = [view.where, view.signIn, view.made, view.lastUsed].filter(Boolean)

  return (
    <li className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-medium text-(--text-primary)">{view.title}</span>
          {view.callSummary ? (
            <code
              className="truncate font-mono text-[11px] text-(--text-secondary)"
              title={view.callSummary}
            >
              {view.callSummary}
            </code>
          ) : null}
          <span className="text-[11px] text-(--text-secondary)">{meta.join(' · ')}</span>
        </div>
        {confirming ? null : (
          <button
            type="button"
            aria-label={`Remove rule: ${view.title}`}
            title="Remove this rule"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded p-1 text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
          >
            <IconClose className="size-3.5" />
          </button>
        )}
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-(--border-subtle) pt-2">
          <span className="mr-auto text-[12px] text-(--text-secondary)">
            {removeActionRuleConfirm(rule)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
            Keep
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={busy}
            onClick={() => {
              setBusy(true)
              void onRemove(rule.id).finally(() => {
                setBusy(false)
                setConfirming(false)
              })
            }}
          >
            Remove
          </Button>
        </div>
      ) : null}
    </li>
  )
}
