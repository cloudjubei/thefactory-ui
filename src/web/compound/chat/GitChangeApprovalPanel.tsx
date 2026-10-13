import { useState } from 'react'

import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'
import { IconBranch, IconChevronDown } from '../../icons'
import {
  GIT_CHANGE_COPY,
  gitChangeCard,
  gitChangeDecisionMetadata,
  gitChangeEditValues,
  gitChangeProblem,
  useProcessRun,
} from '../../../headless'
import type { GitChangeCardView, GitChangeCommitView, PendingToolGrant } from '../../../headless'
import { useGit } from '../../../headless/contexts/GitContext'
import { useActiveProject } from '../../../headless/contexts/ProjectsContext'
import { gitChangeArgs } from '../../../headless/utils/gitChangeApproval'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { branchPickerItems } from '../../../headless/utils/questionPicker'
import { gitChangeAskView, toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import CommitChip from '../chips/CommitChip'
import ToolAskCard from './ToolAskCard'

export type GitChangeApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The change was decided on its card — what the card folds to. */
  onDecided?: (line: ToolAskDecidedLine) => void
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
 * Approving a change to the person's real repository, on the card every
 * waiting tool shares: what it wants and why, the thing itself — the branch to
 * merge (pickable among the project's branches) and where it goes, the commits
 * it brings or drops, the diff — where, as whom, and the arguments the person
 * may change, such as a commit message or a pull request's title. It is never
 * offered for good: every change asks. While a run works on the branch it
 * cannot be approved.
 */
export default function GitChangeApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: GitChangeApprovalPanelProps) {
  const card = gitChangeCard(grant)
  const { run } = useProcessRun(card?.run?.id)
  const { branches } = useGit()
  const { projectId: activeProjectId } = useActiveProject()
  const [values, setValues] = useState(() => (card ? gitChangeEditValues(card) : {}))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!card) return null
  const view = gitChangeAskView(card, gitChangeArgs(grant))
  const problem = gitChangeProblem(card, values, run)
  const setValue = (arg: string, value: string) => setValues((v) => ({ ...v, [arg]: value }))
  const branchNames =
    activeProjectId === card.projectId ? branchPickerItems(branches).map((b) => b.label) : []

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const metadata = decision === 'once' ? gitChangeDecisionMetadata(card, values) : undefined
    grant
      .decide(decision, metadata)
      .then(() => onDecided?.(toolAskDecidedLine(view, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const edits = card.edits ?? []
  return (
    <div className="m-3 flex max-h-[min(70vh,640px)] min-h-0 flex-col">
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        {...(problem !== undefined ? { problem } : {})}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        {edits
          .filter((edit) => edit.kind === 'branch')
          .map((edit) => {
            const value = values[edit.arg] ?? ''
            const options = branchNames.includes(value) ? branchNames : [value, ...branchNames]
            return (
              <div key={edit.arg} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <label className="flex min-w-0 items-center gap-1.5">
                  <IconBranch className="h-3.5 w-3.5 shrink-0 text-(--text-secondary)" />
                  <span className="sr-only">{edit.label}</span>
                  {branchNames.length > 0 ? (
                    <NativeSelect
                      size="sm"
                      className="w-auto max-w-[280px] font-mono"
                      value={value}
                      disabled={busy}
                      onChange={(e) => setValue(edit.arg, e.target.value)}
                    >
                      {options.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Input
                      size="sm"
                      className="font-mono"
                      value={value}
                      disabled={busy}
                      onChange={(e) => setValue(edit.arg, e.target.value)}
                    />
                  )}
                </label>
                {card.branch ? (
                  <>
                    <span className="text-(--text-secondary)">{TOOL_ASK_COPY.into}</span>
                    <span className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-2.5 font-mono">
                      {card.branch}
                    </span>
                  </>
                ) : null}
              </div>
            )
          })}
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
        {edits
          .filter((edit) => edit.kind === 'toggle')
          .map((edit) => (
            <Switch
              key={edit.arg}
              checked={values[edit.arg] === 'true'}
              disabled={busy}
              onCheckedChange={(on) => setValue(edit.arg, String(on))}
              label={edit.label}
            />
          ))}
        {edits
          .filter((edit) => edit.kind === undefined || edit.kind === 'text')
          .map((edit) => (
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
        {card.diff ? <DiffView diff={card.diff} /> : null}
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
          <dt className="text-(--text-muted)">{GIT_CHANGE_COPY.repository}</dt>
          <dd className="m-0 min-w-0 break-all font-mono text-(--text-primary)">{card.repoPath}</dd>
          {card.branch && !edits.some((e) => e.kind === 'branch') ? (
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
      </ToolAskCard>
    </div>
  )
}
