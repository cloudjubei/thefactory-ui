import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileLocationPath, useProjectKnowledge, type KnowledgeWorkRow } from '../../../headless'
import DependencyBullet from '../stories/DependencyBullet'
import ProjectKnowledgeView from './ProjectKnowledgeView'

export type ProjectKnowledgeViewConnectedProps = {
  projectId: string
  className?: string
}

const renderWork = (row: KnowledgeWorkRow) => (
  <DependencyBullet dependency={row.dependency} interactive />
)

/**
 * The Knowledge tab as web and desktop host it: the project's overview read when the tab opens and again whenever
 * the window comes back into view, recorded stories and features as the app's dependency chips, and files opened
 * in the Files tab at their line.
 */
export default function ProjectKnowledgeViewConnected({
  projectId,
  className,
}: ProjectKnowledgeViewConnectedProps) {
  const navigate = useNavigate()
  const { view, refresh } = useProjectKnowledge(projectId)

  useEffect(() => {
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const openFile = useCallback(
    (path: string, line?: number) => navigate(fileLocationPath(projectId, path, line)),
    [navigate, projectId],
  )

  return (
    <ProjectKnowledgeView
      view={view}
      projectId={projectId}
      onOpenFile={openFile}
      renderWork={renderWork}
      onRetry={() => void refresh()}
      {...(className ? { className } : {})}
    />
  )
}
