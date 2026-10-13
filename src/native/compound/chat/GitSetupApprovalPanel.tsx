import { useState } from 'react'
import { Text, View } from 'react-native'

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
import { runProposalArgs } from '../../../headless/utils/runProposalView'
import { gitSetupAskView, toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import ToolAskCard from './ToolAskCard'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type GitSetupApprovalPanelProps = {
  grant: PendingToolGrant
  /** The chat's project — the one being put on GitHub. */
  projectId?: string
  onDecideLater: () => void
  /** The ask was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

const VISIBILITY = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
]

/**
 * Native peer of the web `GitSetupApprovalPanel`, on the shared tool-ask card:
 * what approving `setupProjectGitRepo` creates — account, name, visibility — each editable
 * before anything happens.
 */
export default function GitSetupApprovalPanel({
  grant,
  projectId,
  onDecideLater,
  onDecided,
}: GitSetupApprovalPanelProps) {
  const { theme } = useNativeTheme()
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
  const view = gitSetupAskView(plan, runProposalArgs(grant))
  const set = (patch: Partial<GitSetupForm>) => setForm((f) => ({ ...f, ...patch }))

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const metadata =
      decision === 'once' ? gitSetupDecisionMetadata(form, gitSetupArgs(grant), id) : undefined
    grant
      .decide(decision, metadata)
      .then(() => onDecided?.(toolAskDecidedLine(view, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  return (
    <View style={{ margin: nativeSpace[3] }}>
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        {...(problem !== undefined ? { problem } : {})}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        <View style={{ gap: 2 }}>
          {plan.lines.map((line) => (
            <Text key={line} style={{ fontSize: 13, color: theme.text.secondary }}>
              {`• ${line}`}
            </Text>
          ))}
        </View>

        {plan.createsRepo ? (
          <View style={{ gap: nativeSpace[2] }}>
            <Field label="Repository name" hint={plan.target}>
              <Input
                size="sm"
                value={form.repoName}
                invalid={problem !== undefined}
                disabled={busy}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(repoName) => set({ repoName })}
              />
            </Field>
            <Field label="Owner" hint="A GitHub organisation, or empty for the account itself">
              <Input
                size="sm"
                value={form.owner}
                placeholder={account ?? 'your GitHub account'}
                disabled={busy}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(owner) => set({ owner })}
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
                onChangeText={(description) => set({ description })}
              />
            </Field>
          </View>
        ) : null}
      </ToolAskCard>
    </View>
  )
}
