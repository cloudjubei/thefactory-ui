import { useMemo } from 'react'
import type { ChatContext } from 'thefactory-tools/types'
import { processRunIdOfChatContext } from 'thefactory-tools/utils'

import { useChats } from '../contexts/createChatsContext'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useStories } from '../contexts/StoriesContext'
import { chatHeaderView, chatMessagesCost } from '../utils/chatHeader'
import type { ChatHeaderView } from '../utils/chatHeaderTypes'
import type { ChatMessageLike } from '../utils/chatTypes'
import { useDurationTimer } from './useDurationTimer'
import { useProcessRun } from './useProcessRun'

/**
 * A chat's header, read live: the run a run chat belongs to, the story or
 * feature a story or feature chat is about, the project or group it sits in,
 * and what its messages cost. A host that holds the chat's messages itself —
 * an opened chat — passes them, since the chat list keeps only a summary.
 */
export function useChatHeaderView(
  context: ChatContext,
  messages?: readonly Pick<ChatMessageLike, 'usage' | 'model'>[],
): ChatHeaderView {
  const { getChat } = useChats()
  const { projects } = useProjects()
  const { getGroupById } = useProjectsGroups()
  const { getStory, getFeature, storyDisplayIndex, featureDisplayIndex } = useStories()
  const { run } = useProcessRun(processRunIdOfChatContext(context))
  const now = useDurationTimer(run?.totals?.ticking === true)
  const chat = getChat(context)
  const list =
    messages ?? (chat?.messages as readonly Pick<ChatMessageLike, 'usage' | 'model'>[] | undefined)
  const messagesCost = useMemo(() => (list ? chatMessagesCost(list) : undefined), [list])
  const projectName = context.projectId
    ? projects.find((p) => p.id === context.projectId)?.title
    : undefined
  const group = context.groupId ? getGroupById(context.groupId) : undefined
  const story = context.storyId ? getStory(context.storyId) : undefined
  const feature =
    context.storyId && context.featureId
      ? getFeature(context.storyId, context.featureId)
      : undefined
  const chatTitle = chat?.title ?? undefined
  const listHidden = Boolean(chat?.listHiddenAt)
  return useMemo(
    () =>
      chatHeaderView({
        context,
        now,
        ...(chatTitle ? { chatTitle } : {}),
        ...(projectName ? { projectName } : {}),
        ...(group ? { groupName: group.title, groupProjectCount: group.projects.length } : {}),
        ...(story ? { story } : {}),
        ...(feature ? { feature } : {}),
        storyDisplayIndex,
        featureDisplayIndex,
        ...(run ? { run } : {}),
        ...(messagesCost ? { messagesCost } : {}),
        ...(listHidden ? { listHidden } : {}),
      }),
    [
      context,
      now,
      chatTitle,
      projectName,
      group,
      story,
      feature,
      storyDisplayIndex,
      featureDisplayIndex,
      run,
      messagesCost,
      listHidden,
    ],
  )
}
