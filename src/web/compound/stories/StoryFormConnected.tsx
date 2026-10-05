import { useCallback, type RefObject } from 'react'
import { ProjectChip, StoryForm as PackageStoryForm, type StoryFormValues } from '../..'
import { rankMentionMatches, useActiveProject, useFiles, useProjects } from '../../../headless'
import { useReferences } from '../../../headless/hooks/useReferences'

/**
 * Connected wrapper around the shared `StoryForm`. Owns the web/desktop
 * concerns: resolving `projectId` to a project title via `ProjectsContext` and
 * rendering the `ProjectChip` in the form header, and the description's `@` /
 * `#` / `&` dropdowns with what was typed saved as ids. Everything else
 * (fields, validation, dirty tracking) lives in the primitive so every client
 * stays in lock-step.
 */
export type StoryFormConnectedProps = {
  initialValues?: Partial<StoryFormValues>
  onSubmit: (values: StoryFormValues) => void | Promise<void>
  submitting?: boolean
  isCreate?: boolean
  titleRef?: RefObject<HTMLInputElement | null>
  onDirtyChange?: (dirty: boolean) => void
  formId?: string
  projectId?: string
}

export default function StoryFormConnected({
  initialValues,
  onSubmit,
  submitting,
  isCreate,
  titleRef,
  onDirtyChange,
  formId,
  projectId,
}: StoryFormConnectedProps) {
  const { projects } = useProjects()
  const project = projects.find((p) => p.id === projectId)
  const { paths } = useFiles()
  const { projectId: activeProjectId } = useActiveProject()
  const scopeProjectId = projectId ?? activeProjectId
  const references = useReferences({
    scope: scopeProjectId ? { projectId: scopeProjectId } : undefined,
  })
  const onSearchFiles = useCallback((token: string) => rankMentionMatches(paths, token, 8), [paths])

  return (
    <PackageStoryForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitting={submitting}
      isCreate={isCreate}
      titleRef={titleRef}
      onDirtyChange={onDirtyChange}
      formId={formId}
      mentions={{
        onSearchFiles,
        onSearchReferences: references.searchWork,
        onSearchHandles: references.searchHandles,
      }}
      canonicalize={references.canonicalize}
      renderProjectChip={
        project
          ? () => (
              <ProjectChip label={project.title} description={project.description} nonActionable />
            )
          : undefined
      }
    />
  )
}

export type { StoryFormValues }
