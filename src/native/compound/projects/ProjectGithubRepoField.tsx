import { useState } from 'react'
import { Text, View } from 'react-native'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Switch } from '../../primitives/Switch'
import type { UseProjectGithubRepoResult } from '../../../headless'
import GithubConnectModal from './GithubConnectModal'

export interface ProjectGithubRepoFieldProps {
  github: UseProjectGithubRepoResult
}

function StatusHint({ status }: { status: UseProjectGithubRepoResult['status'] }) {
  if (status === 'checking')
    return <Text className="text-[11px] text-[var(--text-secondary)]">Checking…</Text>
  if (status === 'available')
    return (
      <Text className="text-[11px]" style={{ color: '#16a34a' }}>
        ✓ available
      </Text>
    )
  if (status === 'taken')
    return (
      <Text className="text-[11px]" style={{ color: '#dc2626' }}>
        ✗ taken
      </Text>
    )
  if (status === 'error')
    return <Text className="text-[11px] text-[var(--text-secondary)]">Couldn’t check</Text>
  return null
}

/**
 * Native peer of the web `ProjectGithubRepoField`. The "create a GitHub
 * repository" option for the project-create wizard: toggle always shown; when
 * on it shows a name input + an auto-derived read-only URL preview (the host
 * hides the editable Repository URL), or — when no account is connected — a
 * Connect button that runs the device-auth flow in a popup. Driven by
 * `useProjectGithubRepo` (owned by the host).
 */
export default function ProjectGithubRepoField({ github }: ProjectGithubRepoFieldProps) {
  const { connected, login, enabled, setEnabled, repoName, setRepoName, status, connect } = github
  const [connectOpen, setConnectOpen] = useState(false)

  return (
    <View style={{ gap: 8 }}>
      <Switch checked={enabled} onCheckedChange={setEnabled} label="Create a GitHub repository" />

      {enabled && connected === null ? (
        <Text className="text-[11px] text-[var(--text-secondary)]">Checking GitHub…</Text>
      ) : null}

      {enabled && connected === false ? (
        <View style={{ gap: 8 }}>
          <Text className="text-[11px] text-[var(--text-secondary)]">
            Connect a GitHub account to create this project’s repository. You only do this once.
          </Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              setConnectOpen(true)
              void connect()
            }}
          >
            Connect GitHub
          </Button>
          <GithubConnectModal
            isOpen={connectOpen}
            onClose={() => setConnectOpen(false)}
            github={github}
          />
        </View>
      ) : null}

      {enabled && connected === true ? (
        <View style={{ gap: 8 }}>
          <Field label="Repository name" labelTrailing={<StatusHint status={status} />}>
            <Input
              value={repoName}
              onChangeText={setRepoName}
              placeholder="repository-name"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
          <Field label="Repository URL (created automatically)">
            <View
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)]"
              style={{ paddingHorizontal: 12, paddingVertical: 9 }}
            >
              <Text className="text-[var(--text-secondary)]">
                {`https://github.com/${login ?? '…'}/${repoName || '…'}`}
              </Text>
            </View>
          </Field>
        </View>
      ) : null}
    </View>
  )
}
