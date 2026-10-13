import { useMemo } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatContext } from 'thefactory-tools/types'
import { useChats } from '../contexts/createChatsContext'
import { useFiles } from '../contexts/FilesContext'
import { useGit } from '../contexts/GitContext'
import { useActiveProject, useProjects } from '../contexts/ProjectsContext'
import { useStories } from '../contexts/StoriesContext'
import { useProcesses } from './useProcesses'
import type {
  AgentQuestionOption,
  QuestionPickerItem,
  QuestionPickerKind,
} from '../utils/agentQuestionTypes'
import { formatChatTitle } from '../utils/chatTitle'
import {
  branchPickerItems,
  chatPickerItems,
  featurePickerItems,
  filePickerItems,
  processPickerItems,
  projectPickerItems,
  storyPickerItems,
  withAgentPicks,
} from '../utils/questionPicker'

/** What a question's picker lists, and whether the host has read it yet. */
export type QuestionPickerItems = { items: QuestionPickerItem[]; isLoaded: boolean }

/**
 * The real items a question's picker offers for every kind the app already
 * holds — the active project's branches, files, stories and features, the
 * projects, the chats — with the agent's own options marked among them. A
 * process list is read on demand instead: {@link useProcessPickerItems}.
 */
export function useContextPickerItems(
  kind: Exclude<QuestionPickerKind, 'process'>,
  options: readonly AgentQuestionOption[] | undefined,
): QuestionPickerItems {
  const git = useGit()
  const files = useFiles()
  const stories = useStories()
  const { projects, isLoaded: projectsLoaded } = useProjects()
  const { chats, isLoaded: chatsLoaded } = useChats()

  return useMemo(() => {
    const projectTitle = (id: string | undefined) =>
      id ? projects.find((p) => p.id === id)?.title : undefined
    const storyRows = () =>
      stories.stories.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        ...(stories.storyDisplayIndex(s.id) !== undefined
          ? { index: stories.storyDisplayIndex(s.id) }
          : {}),
        features: s.features.map((f) => ({
          id: f.id,
          title: f.title,
          status: f.status,
          ...(stories.featureDisplayIndex(s.id, f.id) !== undefined
            ? { index: stories.featureDisplayIndex(s.id, f.id) }
            : {}),
        })),
      }))
    const read = (): QuestionPickerItems => {
      switch (kind) {
        case 'branch':
          return { items: branchPickerItems(git.branches), isLoaded: git.isLoaded }
        case 'file':
          return { items: filePickerItems(files.paths), isLoaded: files.isLoaded }
        case 'story':
          return { items: storyPickerItems(storyRows()), isLoaded: stories.isLoaded }
        case 'feature':
          return { items: featurePickerItems(storyRows()), isLoaded: stories.isLoaded }
        case 'project':
          return {
            items: projectPickerItems(projects.map((p) => ({ id: p.id, title: p.title }))),
            isLoaded: projectsLoaded,
          }
        case 'chat':
          return {
            items: chatPickerItems(
              chats.map((c) => {
                const context = c.context as ChatContext
                const projectName = projectTitle(context.projectId)
                return {
                  key: getChatContextKey(context),
                  title: formatChatTitle({
                    context,
                    chatTitle: c.title ?? null,
                    projectName: projectName ?? null,
                    storyDisplayIndex: stories.storyDisplayIndex,
                    featureDisplayIndex: stories.featureDisplayIndex,
                  }),
                  ...(projectName ? { detail: projectName } : {}),
                }
              }),
            ),
            isLoaded: chatsLoaded,
          }
      }
    }
    const { items, isLoaded } = read()
    return { items: withAgentPicks(items, options), isLoaded }
  }, [kind, options, git, files, stories, projects, projectsLoaded, chats, chatsLoaded])
}

/** The processes the active project can run, as a question's picker offers them. */
export function useProcessPickerItems(
  options: readonly AgentQuestionOption[] | undefined,
): QuestionPickerItems {
  const { projectId } = useActiveProject()
  const { processes, isLoaded } = useProcesses(projectId)
  return useMemo(
    () => ({
      items: withAgentPicks(
        processPickerItems(
          processes.map((p) => ({
            id: p.id,
            name: p.name,
            ...(p.description ? { description: p.description } : {}),
          })),
        ),
        options,
      ),
      isLoaded,
    }),
    [processes, isLoaded, options],
  )
}
