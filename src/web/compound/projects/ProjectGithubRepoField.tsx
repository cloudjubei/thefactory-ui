import { useState } from 'react'
import { Button, Field, Input, Switch } from '../..'
import type { UseProjectGithubRepoResult } from '../../../headless'
import GithubConnectModal from './GithubConnectModal'

export interface ProjectGithubRepoFieldProps {
  github: UseProjectGithubRepoResult
}

function StatusHint({ status }: { status: UseProjectGithubRepoResult['status'] }) {
  if (status === 'checking')
    return <span className="text-[11px] text-(--text-secondary)">Checking…</span>
  if (status === 'available')
    return (
      <span className="text-[11px]" style={{ color: '#16a34a' }}>
        ✓ available
      </span>
    )
  if (status === 'taken')
    return (
      <span className="text-[11px]" style={{ color: '#dc2626' }}>
        ✗ name taken
      </span>
    )
  if (status === 'error')
    return <span className="text-[11px] text-(--text-secondary)">Couldn’t check</span>
  return null
}

/**
 * The "create a GitHub repository" option for the project-create wizard. The
 * toggle is always shown; when on it replaces the editable Repository URL field
 * (the host hides that) with a name input + an auto-derived, read-only URL
 * preview, or — when no account is connected — a Connect button that runs the
 * one-time device-auth flow in a popup. Driven by {@link useProjectGithubRepo}.
 */
export default function ProjectGithubRepoField({ github }: ProjectGithubRepoFieldProps) {
  const { connected, login, enabled, setEnabled, repoName, setRepoName, status, connect } = github
  const [connectOpen, setConnectOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-(--text-primary)">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <span>Create a GitHub repository</span>
      </div>

      {enabled && connected === null ? (
        <span className="text-[11px] text-(--text-secondary)">Checking GitHub…</span>
      ) : null}

      {enabled && connected === false ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-(--text-secondary)">
            Connect a GitHub account to create this project’s repository. You only do this once.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
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
        </div>
      ) : null}

      {enabled && connected === true ? (
        <>
          <Field label="Repository name">
            <div className="flex items-center gap-2">
              <Input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="repository-name"
                spellCheck={false}
              />
              <StatusHint status={status} />
            </div>
          </Field>
          <Field label="Repository URL (created automatically)">
            <Input
              value={`https://github.com/${login ?? '…'}/${repoName || '…'}`}
              disabled
              spellCheck={false}
            />
          </Field>
        </>
      ) : null}
    </div>
  )
}
