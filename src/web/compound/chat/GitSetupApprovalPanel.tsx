import { useState } from 'react'

import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import {
  gitSetupArgs,
  gitSetupDecisionMetadata,
  gitSetupFormFor,
  gitSetupFormProblem,
  gitSetupPlan,
  useGitCredentials,
  useProjects,
} from '../../../headless'
import type { GitSetupForm, PendingToolGrant } from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'

export type GitSetupApprovalPanelProps = {
  grant: PendingToolGrant
  /** The chat's project — the one being put on GitHub. */
  projectId?: string
  onDecideLater: () => void
}

const VISIBILITY = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
]

/**
 * Approving `setupProjectGitRepo`: what it will create, said plainly — the
 * account, the repository's name and its visibility — with each of them
 * editable before anything happens. The approval carries only what the user
 * changed; the call then runs with it.
 */
export default function GitSetupApprovalPanel({
  grant,
  projectId,
  onDecideLater,
}: GitSetupApprovalPanelProps) {
  const id = projectId ?? ''
  const { projects } = useProjects()
  const { credentials } = useGitCredentials()
  const project = projects.find((p) => p.id === id)
  const credentialId = (project?.metadata as { githubCredentialsId?: string } | undefined)
    ?.githubCredentialsId
  const account = credentials.find((c) => c.id === credentialId)?.username
  const [form, setForm] = useState<GitSetupForm>(() => gitSetupFormFor(grant, id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const plan = gitSetupPlan(form, {
    ...(project?.title ? { projectTitle: project.title } : {}),
    ...(account ? { account } : {}),
    ...(project?.repo_url ? { existingRemote: project.repo_url } : {}),
  })
  const problem = plan.createsRepo ? gitSetupFormProblem(form) : undefined
  const set = (patch: Partial<GitSetupForm>) => setForm((f) => ({ ...f, ...patch }))

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const metadata =
      decision === 'once' ? gitSetupDecisionMetadata(form, gitSetupArgs(grant), id) : undefined
    void grant.decide(decision, metadata).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-(--border-default) bg-(--surface-raised) px-3 py-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-(--text-primary)">
        <span className="badge badge--soft badge--review badge--sm">
          <span className="badge__dot badge__dot--hollow" />
          Needs you
        </span>
        {plan.headline}
      </div>

      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-[12.5px] text-(--text-secondary)">
        {plan.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {plan.createsRepo ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Repository name" hint={plan.target}>
            <Input
              size="sm"
              value={form.repoName}
              invalid={problem !== undefined}
              disabled={busy}
              onChange={(e) => set({ repoName: e.target.value })}
            />
          </Field>
          <Field label="Owner" hint="A GitHub organisation, or empty for the account itself">
            <Input
              size="sm"
              value={form.owner}
              placeholder={account ?? 'your GitHub account'}
              disabled={busy}
              onChange={(e) => set({ owner: e.target.value })}
            />
          </Field>
          <Field label="Visibility">
            <SegmentedControl
              size="sm"
              ariaLabel="Visibility"
              options={VISIBILITY}
              value={form.private ? 'private' : 'public'}
              onChange={(v) => set({ private: v !== 'public' })}
            />
          </Field>
          <Field label="Description">
            <Input
              size="sm"
              value={form.description}
              placeholder="Optional"
              disabled={busy}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </div>
      ) : null}

      {problem ? <div className="text-xs text-(--color-red-600)">{problem}</div> : null}
      {error !== null ? (
        <div className="rounded-md border border-(--color-red-500) px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
          Decide later
        </Button>
        <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
          Not now
        </Button>
        <Button
          size="sm"
          onClick={() => decide('once')}
          loading={busy}
          disabled={problem !== undefined}
        >
          {plan.createsRepo ? 'Create repository' : 'Push'}
        </Button>
      </div>
    </div>
  )
}
