import { useCommitDetails } from '../../../headless'
import CommitChipBase, { CommitCard } from './CommitChipBase'
import { useCommitOpener } from './CommitOpenerContext'

export type CommitChipProps = {
  projectId: string
  /** The commit's full sha. */
  sha: string
  /** Opens the commit; omitted, a press opens its details, which offer "Open in Git" when the app provides a `CommitOpenerProvider`. */
  onOpen?: () => void
}

/**
 * Native peer of web's `CommitChip`: a commit in a project, read when its
 * details sheet first opens. Built on `CommitChipBase`.
 */
export default function CommitChip({ projectId, sha, onOpen }: CommitChipProps) {
  const openCommit = useCommitOpener()
  return (
    <CommitChipBase
      sha={sha}
      {...(onOpen ? { onOpen } : {})}
      {...(!onOpen && openCommit ? { onOpenInGit: () => openCommit(projectId, sha) } : {})}
      renderDetails={() => <LoadedCommitCard projectId={projectId} sha={sha} />}
    />
  )
}

function LoadedCommitCard({ projectId, sha }: { projectId: string; sha: string }) {
  const state = useCommitDetails(projectId, sha)
  return (
    <CommitCard
      sha={sha}
      {...(state.status === 'ready' ? { details: state.details } : {})}
      loading={state.status === 'loading'}
      missing={state.status === 'missing'}
      {...(state.status === 'failed' ? { error: state.message } : {})}
    />
  )
}
