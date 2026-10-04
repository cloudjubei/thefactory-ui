import { useState } from 'react'
import { Text, View } from 'react-native'

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
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { red } from '../../../tokens/colors'
import { useNativeTheme } from '../../hooks/useNativeTheme'

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
 * Native peer of the web `GitSetupApprovalPanel`: what approving
 * `setupProjectGitRepo` creates — account, name, visibility — each editable
 * before anything happens.
 */
export default function GitSetupApprovalPanel({
  grant,
  projectId,
  onDecideLater,
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
    <View
      style={{
        padding: nativeSpace[3],
        gap: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        backgroundColor: theme.surface.raised ?? theme.surface.muted,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
        {plan.headline}
      </Text>
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

      {problem ? <Text style={{ fontSize: 12, color: red[600] }}>{problem}</Text> : null}
      {error !== null ? (
        <View
          style={{
            padding: nativeSpace[2],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: red[500],
          }}
        >
          <Text style={{ fontSize: 13, color: red[700] }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
        <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
          Later
        </Button>
        <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
          Not now
        </Button>
        <Button
          size="sm"
          onPress={() => decide('once')}
          loading={busy}
          disabled={problem !== undefined}
        >
          {plan.createsRepo ? 'Create repository' : 'Push'}
        </Button>
      </View>
    </View>
  )
}
