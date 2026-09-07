import { useState } from 'react'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import Surface from '../../primitives/Surface'
import { IconToolbox } from '../../icons'
import type { PendingRemedyGrant } from '../../../headless/utils/chatTypes'
import type { AgentRemedyOption } from '../../../headless/utils/agentRemedyTypes'

export type RemedyCardProps = {
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
 * A mid-run blocker a remediable tool raised, rendered inline. The run is parked
 * until the user unblocks it: pick a hint (e.g. which emulator), let an agent go
 * fix the environment, or fix it by hand and retry. Not a permission prompt —
 * these are structured choices, so it never renders as Allow/Deny.
 */
export default function RemedyCard({ grant, disabled }: RemedyCardProps) {
  const { tool, summary, detail, attempted, remedies, raw } = grant.remedy
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Custom hint text, keyed by option id (for a hint option with no/other suggestion).
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
        <div key={option.id} className="flex flex-col gap-2 border-t border-(--border-subtle) pt-2">
          <span className="text-[12px] font-medium">{option.label}</span>
          {option.suggestions && option.suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {option.suggestions.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => void run(() => grant.resolveRemedy(option.id, s))}
                >
                  {s}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              rows={1}
              value={custom[option.id] ?? ''}
              onChange={(e) => setCustom((p) => ({ ...p, [option.id]: e.target.value }))}
              placeholder={option.param ? `Value for ${option.param}…` : 'Value…'}
              aria-label={option.label}
              disabled={locked}
            />
            <Button
              size="sm"
              disabled={locked || !custom[option.id]?.trim()}
              onClick={() => void run(() => grant.resolveRemedy(option.id, custom[option.id]))}
            >
              Apply
            </Button>
          </div>
        </div>
      )
    }
    // agent / manual: a single action button.
    return (
      <div key={option.id} className="border-t border-(--border-subtle) pt-2">
        <Button
          size="sm"
          variant={option.kind === 'agent' ? 'secondary' : 'outline'}
          disabled={locked}
          onClick={() => void run(() => grant.resolveRemedy(option.id))}
        >
          {option.label}
        </Button>
      </div>
    )
  }

  return (
    <Surface className="p-3 flex flex-col gap-3" style={{ borderColor: 'var(--accent-primary)' }}>
      <div className="flex items-start gap-2">
        <IconToolbox className="w-4 h-4 mt-0.5 shrink-0 text-(--accent-primary)" />
        <div className="min-w-0 flex flex-col">
          <span className="text-sm font-semibold">A tool is blocked</span>
          <span className="text-[12px] text-(--text-secondary)">
            <code>{tool}</code> can’t continue — choose how to unblock it.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm whitespace-pre-wrap wrap-break-word">{summary}</p>
        {detail ? (
          <p className="text-[12px] text-(--text-secondary) whitespace-pre-wrap wrap-break-word">
            {detail}
          </p>
        ) : null}
        {attempted && attempted.length > 0 ? (
          <p className="text-[12px] text-(--text-secondary)">
            Already tried: {attempted.join('; ')}.
          </p>
        ) : null}
        {raw !== undefined ? (
          <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto text-(--text-secondary)">
            {formatRaw(raw)}
          </pre>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">{remedies.map(renderOption)}</div>

      {error ? <p className="text-[12px] text-red-500">{error}</p> : null}

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          disabled={locked}
          onClick={() => void run(() => grant.dismissRemedy())}
        >
          Dismiss
        </Button>
      </div>
    </Surface>
  )
}
