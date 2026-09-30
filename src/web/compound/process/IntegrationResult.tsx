import { useState } from 'react'

import {
  extractErrorMessage,
  PROCESS_INTEGRATION_RETRY,
  PROCESS_INTEGRATION_RETRY_HEAD,
  processIntegrationView,
  type ProcessIntegrationMode,
  type ProcessRun,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import IntegrationChooser from './IntegrationChooser'

export type IntegrationResultProps = {
  run: ProcessRun
  onRetry: (mode: ProcessIntegrationMode) => Promise<void>
}

/**
 * What bringing an approved story's work in came to, on the run: the merged
 * commit, the pull request (opened in the browser), or why it did not land —
 * with a retry, the same way or another.
 */
export default function IntegrationResult({ run, onRetry }: IntegrationResultProps) {
  const [choosing, setChoosing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const view = processIntegrationView(run)
  if (!view || !run.workBranch) return null
  const workBranch = run.workBranch

  const retry = (mode: ProcessIntegrationMode) => {
    setSending(true)
    setError(undefined)
    onRetry(mode)
      .then(() => setChoosing(false))
      .catch((err: unknown) =>
        setError(extractErrorMessage(err, 'The work could not be brought in.')),
      )
      .finally(() => setSending(false))
  }

  return (
    <div
      role="status"
      className="mx-4 mb-3 flex flex-col gap-2 rounded-lg p-3"
      style={{
        background: `var(--status-${view.tone}-soft-bg)`,
        border: `1px solid var(--status-${view.tone}-soft-border)`,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[13px] font-semibold"
          style={{ color: `var(--status-${view.tone}-soft-fg)` }}
        >
          {view.title}
        </span>
        {view.sha ? (
          <code className="rounded bg-(--surface-sunken) px-1.5 py-px font-mono text-[11px] text-(--text-secondary)">
            {view.sha}
          </code>
        ) : null}
      </div>
      {view.detail ? (
        <span className="max-w-[72ch] whitespace-pre-wrap text-[12px] text-(--text-secondary)">
          {view.detail}
        </span>
      ) : null}
      {view.link ? (
        <a
          href={view.link.url}
          target="_blank"
          rel="noreferrer"
          className="self-start text-[12px] font-medium text-(--accent-primary) underline"
        >
          {view.link.label} ↗
        </a>
      ) : null}
      {error ? <span className="text-[12px] text-(--status-stuck-soft-fg)">{error}</span> : null}
      {view.canRetry ? (
        choosing ? (
          <IntegrationChooser
            workBranch={workBranch}
            head={PROCESS_INTEGRATION_RETRY_HEAD}
            busy={sending}
            onChoose={retry}
            onCancel={() => setChoosing(false)}
          />
        ) : (
          <div>
            <Button size="sm" variant="primary" onClick={() => setChoosing(true)}>
              {PROCESS_INTEGRATION_RETRY}
            </Button>
          </div>
        )
      ) : null}
    </div>
  )
}
