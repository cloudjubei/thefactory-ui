import { useMemo } from 'react'
import type { ChatContext, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey, processRunIdOfChatContext } from 'thefactory-tools/utils'

import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import { useActiveProject, useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useStories } from '../contexts/StoriesContext'
import { chatListRow, isChatInChatList } from '../utils/chatList'
import type { ChatListChat, ChatListRow, ChatListScope, ChatListWork } from '../utils/chatListTypes'
import { chatNotifyLevel } from '../utils/chatNotify'
import { computeChatRowStatus, type ChatsSeenMap } from '../utils/chatRowStatus'
import { usePendingAsksByChat } from './usePendingAsksByChat'
import { useProcessRuns } from './useProcessRuns'

function mainChatOf(scope: ChatListScope): ChatContext {
  return scope.kind === 'project'
    ? { type: 'PROJECT', projectId: scope.projectId }
    : { type: 'GROUP', groupId: scope.groupId }
}

function workDependency(context: ChatContext, activeProjectId: string | null | undefined) {
  if (!context.storyId) return undefined
  const ref = context.featureId ? `${context.storyId}.${context.featureId}` : context.storyId
  return context.projectId && context.projectId !== activeProjectId
    ? `${context.projectId}/${ref}`
    : ref
}

/**
 * Every chat of a scope as a chat-list row, kept live: each chat's asks, unread
 * news and thinking state, the process run a run chat belongs to, the story or
 * feature a work chat is about — another project's read on demand — and the
 * project a row sits in. The scope's own main chat is listed before it exists,
 * so the first message can be sent from it. `seen` is the host's read-state map.
 */
export function useChatList(scope: ChatListScope, seen: ChatsSeenMap): ChatListRow[] {
  const { chats, getChatLiveState } = useChats()
  const pendingAsks = usePendingAsksByChat()
  const notifyLevels = useAppSettings().settings.notifications.chatNotifyLevels
  const { runs } = useProcessRuns()
  const { resolveDependency } = useStories()
  const { projectId: activeProjectId } = useActiveProject()
  const { projects } = useProjects()
  const { groups } = useProjectsGroups()

  return useMemo(() => {
    const runById = new Map<string, ProcessRun>(runs.map((r) => [r.id, r]))
    const projectById = new Map(projects.map((p) => [p.id, p]))
    const groupById = new Map(groups.map((g) => [g.id, g]))
    const main = mainChatOf(scope)
    const listed: ChatListChat[] = chats.filter((c) => isChatInChatList(c.context))
    const mainKey = getChatContextKey(main)
    if (!listed.some((c) => getChatContextKey(c.context) === mainKey))
      listed.push({ context: main })

    const workOf = (context: ChatContext): ChatListWork | undefined => {
      const dependency = workDependency(context, activeProjectId)
      if (!dependency) return undefined
      const resolved = resolveDependency(dependency)
      if (!('kind' in resolved)) return undefined
      const item = resolved.kind === 'feature' ? resolved.feature : resolved.story
      return { title: item.title, status: item.status, ref: `#${resolved.display}` }
    }

    return listed.map((chat) => {
      const { context } = chat
      const key = getChatContextKey(context)
      const status = computeChatRowStatus({
        context,
        contextKey: key,
        chat,
        isSending: getChatLiveState(context).isSending,
        seen,
        pendingAsks: pendingAsks.get(key) ?? 0,
        level: chatNotifyLevel(chat, notifyLevels),
      })
      const runId = processRunIdOfChatContext(context)
      const run = runId ? runById.get(runId) : undefined
      const project = context.projectId ? projectById.get(context.projectId) : undefined
      const projectIcon = (project?.metadata as { icon?: string } | undefined)?.icon
      const group = context.groupId ? groupById.get(context.groupId) : undefined
      const work =
        context.type === 'STORY' || context.type === 'FEATURE' ? workOf(context) : undefined
      return chatListRow({
        chat,
        status,
        ...(run ? { run } : {}),
        ...(work ? { work } : {}),
        ...(project ? { projectName: project.title } : {}),
        ...(projectIcon ? { projectIcon } : {}),
        ...(group ? { groupName: group.title } : {}),
      })
    })
  }, [
    chats,
    getChatLiveState,
    pendingAsks,
    notifyLevels,
    runs,
    resolveDependency,
    activeProjectId,
    projects,
    groups,
    scope,
    seen,
  ])
}
