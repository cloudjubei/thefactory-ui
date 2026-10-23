import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useProjectKnowledge, type KnowledgeWorkRow } from '../../../headless'
import DependencyRef from '../stories/DependencyRef'
import ProjectKnowledgeView from './ProjectKnowledgeView'

export type ProjectKnowledgeViewConnectedProps = {
  projectId: string
  /** Opens a file at its line — the host pushes its file screen. */
  onOpenFile: (path: string, line?: number) => void
  /** Calls `onFocus` whenever the host's screen comes back into view; returns the unsubscribe. */
  subscribeFocus?: (onFocus: () => void) => () => void
}

const renderWork = (row: KnowledgeWorkRow) => <DependencyRef dependency={row.dependency} />

/**
 * The Knowledge tab as mobile hosts it: the project's overview read when the screen opens, again when it comes back
 * into view and when the app returns to the foreground; recorded stories and features as the app's story chips;
 * files opened through the host.
 */
export default function ProjectKnowledgeViewConnected({
  projectId,
  onOpenFile,
  subscribeFocus,
}: ProjectKnowledgeViewConnectedProps) {
  const { view, refresh } = useProjectKnowledge(projectId)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  useEffect(() => subscribeFocus?.(() => void refresh()), [subscribeFocus, refresh])

  return (
    <ProjectKnowledgeView
      view={view}
      projectId={projectId}
      onOpenFile={onOpenFile}
      renderWork={renderWork}
      onRetry={() => void refresh()}
    />
  )
}
