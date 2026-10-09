import { useState } from 'react'

import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Textarea } from '../../primitives/Textarea'
import { IconChevronDown } from '../../icons'
import {
  GIT_CHANGE_COPY,
  gitChangeCard,
  gitChangeDecisionMetadata,
  gitChangeEditValues,
  gitChangeProblem,
  useProcessRun,
} from '../../../headless'
import type { GitChangeCardView, GitChangeCommitView, PendingToolGrant } from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import CommitChip from '../chips/CommitChip'

export type GitChangeApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

const STATUS_MARK: Record<string, string> = { added: 'A', modified: 'M', deleted: 'D' }

function CommitList({
  projectId,
  label,
  commits,
  total,
}: {
  projectId: string
  label: string
  commits: GitChangeCommitView[]
  total: number
}) {
  if (total === 0) return null
  return (
    <section className="flex flex-col gap-1">
      <h4 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {label} ({total})
      </h4>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {commits.map((c) => (
          <li key={c.sha} className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <CommitChip projectId={projectId} sha={c.sha} />
            <span className="min-w-0 flex-1 truncate text-(--text-primary)">{c.subject}</span>
            <span className="shrink-0 text-(--text-muted)">{c.author}</span>
          </li>
        ))}
        {total > commits.length ? (
          <li className="text-[12px] text-(--text-muted)">
            {GIT_CHANGE_COPY.more(total - commits.length)}
          </li>
        ) : null}
      </ul>
    </section>
  )
}

function DiffView({ diff }: { diff: NonNullable<GitChangeCardView['diff']> }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="flex flex-col gap-1">
      <button
        type="button"
        className="flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {GIT_CHANGE_COPY.diff} — {diff.files.length} {diff.files.length === 1 ? 'file' : 'files'}
        <IconChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-[12px]">
        {diff.files.map((f) => (
          <li key={f.path} className="flex gap-2 text-(--text-secondary)">
            <span className="w-3 shrink-0 font-semibold">{STATUS_MARK[f.status] ?? '?'}</span>
            <span className="min-w-0 break-all">{f.path}</span>
            {f.binary ? <span className="text-(--text-muted)">binary</span> : null}
          </li>
        ))}
      </ul>
      {open && diff.patch ? (
        <pre className="m-0 max-h-[240px] overflow-auto rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 font-mono text-[11.5px] leading-snug text-(--text-secondary)">
          {diff.patch.split('\n').map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith('+') && !line.startsWith('+++')
                  ? 'text-(--status-done-soft-fg)'
                  : line.startsWith('-') && !line.startsWith('---')
                    ? 'text-(--status-stuck-soft-fg)'
                    : undefined
              }
            >
              {line || ' '}
            </div>
          ))}
        </pre>
      ) : null}
      {diff.patchTruncated ? (
        <span className="text-[12px] text-(--text-muted)">{GIT_CHANGE_COPY.diffTruncated}</span>
      ) : null}
    </section>
  )
}

/**
 * Approving a change to the person's real repository: where (the repository's
 * path, the branch, the run working on it), what (the exact diff, or the
 * commits it brings or drops), as whom, and the arguments the card lets the
 * person change, such as a commit message or a pull request's title. It is never offered for good: every change asks. While a
 * run works on the branch it cannot be approved.
 */
export default function GitChangeApprovalPanel({
  grant,
  onDecideLater,
}: GitChangeApprovalPanelProps) {
  const card = gitChangeCard(grant)
  const { run } = useProcessRun(card?.run?.id)
  const [values, setValues] = useState(() => (card ? gitChangeEditValues(card) : {}))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!card) return null
  const problem = gitChangeProblem(card, values, run)
  const setValue = (arg: string, value: string) => setValues((v) => ({ ...v, [arg]: value }))

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const metadata = decision === 'once' ? gitChangeDecisionMetadata(card, values) : undefined
    void grant.decide(decision, metadata).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  return (
    <div className="m-3 flex max-h-[min(70vh,640px)] min-h-0 flex-col overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-raised)">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-(--border-subtle) bg-(--surface-base) px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`badge badge--soft badge--sm shrink-0 ${card.danger ? 'badge--stuck' : 'badge--working'}`}
          >
            {GIT_CHANGE_COPY.kind}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-(--text-primary)">
            {card.headline}
          </span>
        </div>
        <div className="rounded-md border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-2.5 py-1.5 text-[12.5px] font-semibold text-(--status-stuck-soft-fg)">
          {card.warning}
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
          <dt className="text-(--text-muted)">{GIT_CHANGE_COPY.repository}</dt>
          <dd className="m-0 min-w-0 break-all font-mono text-(--text-primary)">{card.repoPath}</dd>
          {card.branch ? (
            <>
              <dt className="text-(--text-muted)">{GIT_CHANGE_COPY.branch}</dt>
              <dd className="m-0 min-w-0 break-all font-mono text-(--text-primary)">
                {card.branch}
              </dd>
            </>
          ) : null}
          {card.run ? (
            <>
              <dt className="text-(--text-muted)">{GIT_CHANGE_COPY.run}</dt>
              <dd className="m-0 min-w-0 truncate text-(--text-primary)">
                {card.run.title}
                {run ? <span className="text-(--text-muted)"> · {run.status}</span> : null}
              </dd>
            </>
          ) : null}
          {card.identity ? (
            <>
              <dt className="text-(--text-muted)">{GIT_CHANGE_COPY.commitsAs}</dt>
              <dd className="m-0 min-w-0 truncate text-(--text-primary)">
                {card.identity.name} &lt;{card.identity.email}&gt;
              </dd>
            </>
          ) : null}
        </dl>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
        {(card.edits ?? []).map((edit) => (
          <label key={edit.arg} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
              {edit.label}
            </span>
            {edit.multiline ? (
              <Textarea
                value={values[edit.arg] ?? ''}
                rows={3}
                disabled={busy}
                onChange={(e) => setValue(edit.arg, e.target.value)}
              />
            ) : (
              <Input
                size="sm"
                value={values[edit.arg] ?? ''}
                disabled={busy}
                onChange={(e) => setValue(edit.arg, e.target.value)}
              />
            )}
          </label>
        ))}
        {card.facts.length > 0 ? (
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-[12.5px] text-(--text-secondary)">
            {card.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        {card.commits ? (
          <>
            <CommitList
              projectId={card.projectId}
              label={GIT_CHANGE_COPY.gained}
              commits={card.commits.gained}
              total={card.commits.gainedTotal}
            />
            <CommitList
              projectId={card.projectId}
              label={GIT_CHANGE_COPY.dropped}
              commits={card.commits.dropped}
              total={card.commits.droppedTotal}
            />
          </>
        ) : null}
        {card.diff ? <DiffView diff={card.diff} /> : null}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 border-t border-(--border-subtle) px-3 py-2">
        {problem ? (
          <div className="text-[12px] text-(--status-stuck-soft-fg)">{problem}</div>
        ) : null}
        {error !== null ? (
          <div className="rounded-md border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-2.5 py-1.5 text-[12px] text-(--status-stuck-soft-fg)">
            {error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
            {GIT_CHANGE_COPY.later}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
            {GIT_CHANGE_COPY.decline}
          </Button>
          <Button
            size="sm"
            variant={card.danger ? 'danger' : 'primary'}
            onClick={() => decide('once')}
            loading={busy}
            disabled={problem !== undefined}
          >
            {card.danger ? GIT_CHANGE_COPY.approveDanger : GIT_CHANGE_COPY.approve}
          </Button>
        </div>
      </div>
    </div>
  )
}
