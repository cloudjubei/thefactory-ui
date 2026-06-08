import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import Surface from '../../primitives/Surface'
import type { PendingToolGrant } from '../../../headless'
import type { PendingToolConfirmationLike } from '../../../headless/utils/chatTypes'

export type ToolConfirmationModalProps = {
  pending: PendingToolConfirmationLike | null
  busy: boolean
  onConfirm: (grantedToolCallIds: string[]) => Promise<void> | void
  onCancel: () => void
  /**
   * Unified tool-approval feed spanning both the API confirmation path and the
   * CLI permission broker. When provided, the modal renders each grant as its
   * own row with per-grant Allow / Deny actions (plus "Allow permanently" for
   * CLI grants) and the {@link pending}/{@link onConfirm} path is ignored.
   */
  grants?: PendingToolGrant[]
}

function formatJson(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Surfaces the proposed tool calls when the backend returns
 * `require_confirmation` from `sendCompletionWithTools` / `resumeCompletion`.
 * Each tool call is granted individually by toolCallId — the resume request
 * uses that list to decide which ones run.
 */
export default function ToolConfirmationModal({
  pending,
  busy,
  onConfirm,
  onCancel,
  grants,
}: ToolConfirmationModalProps) {
  const [granted, setGranted] = useState<Record<string, boolean>>({})

  // Reset selection whenever a new wave of tools arrives — the toolCallIds
  // change between waves, so prior choices are meaningless.
  useEffect(() => {
    if (!pending) return
    const next: Record<string, boolean> = {}
    for (const t of pending.toolCalls) next[t.toolCallId] = true
    setGranted(next)
  }, [pending])

  const grantedIds = useMemo(
    () =>
      Object.entries(granted)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [granted],
  )

  if (grants) {
    if (grants.length === 0) return null
    return (
      <Modal
        isOpen
        onClose={onCancel}
        title="The agent wants to run tools"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => grants.forEach((g) => void g.decide('deny'))}
              disabled={busy}
            >
              Deny all
            </Button>
            <Button
              onClick={() => grants.forEach((g) => void g.decide('once'))}
              loading={busy}
              disabled={grants.length === 0}
            >
              Allow all
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {grants.map((grant) => (
            <Surface as="li" key={grant.id} className="p-3 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <code className="text-sm font-medium">{grant.label}</code>
                {grant.detail !== undefined && (
                  <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-48 overflow-auto opacity-90">
                    {formatJson(grant.detail)}
                  </pre>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void grant.decide('deny')}
                  disabled={busy}
                >
                  Deny
                </Button>
                <Button
                  size="sm"
                  onClick={() => void grant.decide('once')}
                  disabled={busy}
                >
                  Allow
                </Button>
                {grant.source === 'cli' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void grant.decide('permanent')}
                    disabled={busy}
                  >
                    Allow permanently
                  </Button>
                )}
              </div>
            </Surface>
          ))}
        </ul>
      </Modal>
    )
  }

  if (!pending) return null

  const allOn = pending.toolCalls.every((t) => granted[t.toolCallId])
  const noneOn = pending.toolCalls.every((t) => !granted[t.toolCallId])

  const setAll = (value: boolean) =>
    setGranted(Object.fromEntries(pending.toolCalls.map((t) => [t.toolCallId, value])))

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="The agent wants to run tools"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => void onConfirm([])} disabled={busy}>
            Deny all
          </Button>
          <Button onClick={() => void onConfirm(grantedIds)} loading={busy} disabled={noneOn}>
            {allOn ? 'Allow all' : `Allow ${grantedIds.length}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm opacity-80">
          Untick any tool you don't want to run. Denied tools come back to the agent as
          <code className="mx-1 text-xs">not_allowed</code>; the agent will adjust and may propose
          different tools next turn.
        </p>
        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            className="opacity-70 hover:opacity-100 underline"
            onClick={() => setAll(true)}
          >
            Select all
          </button>
          <button
            type="button"
            className="opacity-70 hover:opacity-100 underline"
            onClick={() => setAll(false)}
          >
            Select none
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {pending.toolCalls.map((tc) => (
            <Surface as="li" key={tc.toolCallId} className="p-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={granted[tc.toolCallId] ?? false}
                  onChange={(e) =>
                    setGranted((prev) => ({ ...prev, [tc.toolCallId]: e.target.checked }))
                  }
                />
                <code className="text-sm font-medium">{tc.name}</code>
                <span className="text-[10px] opacity-50 font-mono">{tc.toolCallId}</span>
              </label>
              {tc.arguments !== undefined && (
                <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-48 overflow-auto opacity-90">
                  {formatJson(tc.arguments)}
                </pre>
              )}
            </Surface>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
