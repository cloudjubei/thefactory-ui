import { useNavigate } from 'react-router-dom'

import { commitGitViewPath, useCommitDetails } from '../../../headless'
import CommitChipBase, { CommitCard } from './CommitChipBase'

export type CommitChipProps = {
  projectId: string
  /** The commit's full sha. */
  sha: string
  className?: string
}

/**
 * A commit in a project, as a chip: read on first hover for its card, and a
 * click that opens it in the project's Git view. Built on `CommitChipBase`.
 */
export default function CommitChip({ projectId, sha, className }: CommitChipProps) {
  const navigate = useNavigate()
  return (
    <CommitChipBase
      sha={sha}
      {...(className ? { className } : {})}
      onOpen={() => navigate(commitGitViewPath(projectId, sha))}
      renderTooltip={() => <LoadedCommitCard projectId={projectId} sha={sha} />}
    />
  )
}

function LoadedCommitCard({ projectId, sha }: { projectId: string; sha: string }) {
  const state = useCommitDetails(projectId, sha)
  return (
    <CommitCard
      sha={sha}
      openable
      {...(state.status === 'ready' ? { details: state.details } : {})}
      loading={state.status === 'loading'}
      missing={state.status === 'missing'}
      {...(state.status === 'failed' ? { error: state.message } : {})}
    />
  )
}
