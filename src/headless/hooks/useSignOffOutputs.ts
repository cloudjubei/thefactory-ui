import { useCallback, useMemo, useState } from 'react'
import { updateProject, type SignOffOutputDefinition } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import {
  readSignOffOutputs,
  signOffOutputsIntro,
  signOffOutputSettingViews,
  signOffTemplateChoices,
  withoutSignOffOutput,
  withSavedSignOffOutput,
  withSignOffOutputs,
} from '../utils/signOffOutputSettings'
import { SIGN_OFF_OUTPUT_COPY } from '../utils/signOffOutputSettingsConstants'
import type {
  SignOffOutputOwner,
  SignOffOutputSettingView,
  SignOffTemplateChoice,
} from '../utils/signOffOutputSettingsTypes'
import { useGroupNotes } from './useGroupNotes'
import { useProjectNotes } from './useProjectNotes'

export type UseSignOffOutputs = {
  /** What to show of each output; undefined until the owner is read. */
  views: SignOffOutputSettingView[] | undefined
  /** The outputs kept here, which a new one must not repeat. */
  own: readonly SignOffOutputDefinition[]
  /** The notes a template can be. */
  choices: readonly SignOffTemplateChoice[]
  /** What to say when there is no note to choose. */
  noNotes: string
  intro: string
  /** A scope group's outputs reach nobody, so none can be added to one. */
  canAdd: boolean
  error: string | null
  busy: boolean
  save: (output: SignOffOutputDefinition, editing: string | undefined) => Promise<boolean>
  remove: (key: string) => Promise<boolean>
}

/** A project's or a group's sign-off outputs, and the notes their templates are in. */
export function useSignOffOutputs(owner: SignOffOutputOwner): UseSignOffOutputs {
  const { groups, updateGroup } = useProjectsGroups()
  const { projects, refresh } = useProjects()
  const project =
    owner.kind === 'project' ? projects.find((p) => p.id === owner.projectId) : undefined
  const group = owner.kind === 'group' ? groups.find((g) => g.id === owner.groupId) : undefined
  const mainGroup = project ? groups.find((g) => g.id === project.mainGroupId) : undefined
  const projectNotes = useProjectNotes(owner.kind === 'project' ? owner.projectId : undefined)
  const groupNotes = useGroupNotes(owner.kind === 'group' ? owner.groupId : mainGroup?.id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const metadata = project?.metadata as Record<string, unknown> | undefined
  const own = useMemo(
    () => (project ? readSignOffOutputs(metadata) : (group?.signOffOutputs ?? [])),
    [project, metadata, group],
  )
  const ownNotes = owner.kind === 'project' ? projectNotes : groupNotes
  const notesFailed = ownNotes.loadError !== null || groupNotes.loadError !== null
  const notesRead =
    !notesFailed && ownNotes.isLoaded && (owner.kind === 'group' || groupNotes.isLoaded)

  const views = useMemo(
    () =>
      project || group
        ? signOffOutputSettingViews({
            own,
            ownNotes: ownNotes.notes,
            ...(mainGroup ? { mainGroup, groupNotes: groupNotes.notes } : {}),
            notesRead,
          })
        : undefined,
    [project, group, own, ownNotes.notes, mainGroup, groupNotes.notes, notesRead],
  )

  const persist = useCallback(
    async (next: SignOffOutputDefinition[]) => {
      setBusy(true)
      setError(null)
      try {
        if (owner.kind === 'group') {
          await updateGroup(owner.groupId, { signOffOutputs: next })
        } else {
          await updateProject({
            path: { id: owner.projectId },
            body: { metadata: withSignOffOutputs(metadata, next) },
            throwOnError: true,
          })
          await refresh()
        }
        return true
      } catch (err) {
        setError(extractErrorMessage(err, SIGN_OFF_OUTPUT_COPY.saveFailed))
        return false
      } finally {
        setBusy(false)
      }
    },
    [owner, metadata, updateGroup, refresh],
  )

  const save = useCallback<UseSignOffOutputs['save']>(
    (output, editing) => persist(withSavedSignOffOutput(own, output, editing)),
    [own, persist],
  )
  const remove = useCallback<UseSignOffOutputs['remove']>(
    (key) => persist(withoutSignOffOutput(own, key)),
    [own, persist],
  )

  return {
    views,
    own,
    choices: signOffTemplateChoices(ownNotes.notes),
    noNotes:
      owner.kind === 'project'
        ? SIGN_OFF_OUTPUT_COPY.noNotesProject
        : SIGN_OFF_OUTPUT_COPY.noNotesGroup,
    intro: signOffOutputsIntro(owner, project?.title ?? group?.title ?? '', group?.type),
    canAdd: owner.kind === 'project' || group?.type === 'MAIN',
    error: error ?? (notesFailed ? SIGN_OFF_OUTPUT_COPY.notesFailed : null),
    busy,
    save,
    remove,
  }
}
