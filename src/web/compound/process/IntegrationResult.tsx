import { useState } from 'react'

import {
  PROCESS_INTEGRATION_CONFLICT,
  PROCESS_INTEGRATION_FORM_LABELS,
  PROCESS_INTEGRATION_RETRY,
  PROCESS_INTEGRATION_RETRY_HEAD,
  processIntegrationView,
  type ProcessIntegrationDecision,
  type ProcessIntegrationMode,
  type ProcessRun,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import IntegrationChooser from './IntegrationChooser'

export type IntegrationResultProps = {
  run: ProcessRun
  /** The only ways the work may land, when they are narrowed. */
  modes?: readonly ProcessIntegrationMode[]
  /** Resolves `false` when refused — the reason then arrives as `error`. */
  onRetry: (decision: ProcessIntegrationDecision) => Promise<boolean>
  /** Send work that conflicts with its base to an agent; resolves `false` when refused. */
  onResolve: () => Promise<boolean>
  /** Why the last retry was refused. */
  error?: string | null
}

/**
 * What bringing an approved story's work in came to, on the run: the merged
 * commit, the pull request (opened in the browser), or why it did not land —
 * with a retry, the same way or another, and, when it conflicts with its base,
 * an agent to resolve it. While an agent resolves the conflict, and when the
 * work comes back to be confirmed, it says so and shows what changed.
 */
export default function IntegrationResult({
  run,
  modes,
  onRetry,
  onResolve,
  error,
}: IntegrationResultProps) {
  const [choosing, setChoosing] = useState<{ mode?: ProcessIntegrationMode } | null>(null)
  const [sending, setSending] = useState(false)
  const view = processIntegrationView(run)
  if (!view || !run.workBranch) return null
  const workBranch = run.workBranch
  const pullRequestOffered = !workBranch.shadow && (!modes || modes.includes('pull-request'))

  const settle = (attempt: Promise<boolean>) => {
    setSending(true)
    attempt
      .then((ok) => {
        if (ok) setChoosing(null)
      })
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
      {view.files && view.files.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {view.files.map((file) => (
            <li key={file}>
              <code className="font-mono text-[11.5px] text-(--text-primary)">{file}</code>
            </li>
          ))}
        </ul>
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
            runId={run.id}
            workBranch={workBranch}
            {...(modes ? { modes } : {})}
            {...(choosing.mode ? { initialMode: choosing.mode } : {})}
            head={PROCESS_INTEGRATION_RETRY_HEAD}
            submitLabel={PROCESS_INTEGRATION_FORM_LABELS.confirm}
            busy={sending}
            onChoose={(decision) => settle(onRetry(decision))}
            onCancel={() => setChoosing(null)}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {view.conflict ? (
              <span className="max-w-[72ch] text-[11.5px] text-(--text-secondary)">
                {PROCESS_INTEGRATION_CONFLICT.resolveDetail}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {view.conflict ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={sending}
                  onClick={() => settle(onResolve())}
                >
                  {PROCESS_INTEGRATION_CONFLICT.resolve}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={view.conflict ? 'ghost' : 'primary'}
                disabled={sending}
                onClick={() =>
                  workBranch.shadow ? settle(onRetry({ mode: 'merge' })) : setChoosing({})
                }
              >
                {PROCESS_INTEGRATION_RETRY}
              </Button>
              {view.conflict && pullRequestOffered ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={sending}
                  onClick={() => setChoosing({ mode: 'pull-request' })}
                >
                  {PROCESS_INTEGRATION_CONFLICT.openPullRequest}
                </Button>
              ) : null}
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}
