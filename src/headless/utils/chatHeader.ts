import type { ChatContext } from 'thefactory-tools/types'
import { processRunIdOfChatContext, processRunStopHolder } from 'thefactory-tools/utils'

import {
  CHAT_AGENT_RUN_KIND_LABEL,
  CHAT_HEADER_ARCHIVED_PILL,
  CHAT_HEADER_ASSISTANT_CONTEXT,
  CHAT_HEADER_CHAT_COST_TITLE,
  CHAT_HEADER_RUN_TIME_TITLE,
  CHAT_KIND_VIEW,
} from './chatHeaderConstants'
import type { ChatHeaderInput, ChatHeaderPill, ChatHeaderView, ChatKind } from './chatHeaderTypes'
import { formatChatTitle } from './chatTitle'
import type { ChatMessageLike } from './chatTypes'
import { addCost, costChipLabel, messageUsageCost } from './costDetails'
import type { CostSource } from './costDetailsTypes'
import {
  processRunBadge,
  processRunSpend,
  processRunWorkMs,
  formatProcessDuration,
} from './processView'
import { processTimeDetailsView } from './processTimeDetails'
import { statusLabel } from './status'
import {
  featureStripEntries,
  processRunStripEntries,
  storyStatusTone,
  storyStripEntries,
} from './stepsStrip'
import { STEPS_STRIP_LABELS } from './stepsStripConstants'
import type { StepsStripModel } from './stepsStripTypes'

/** What a chat is about, read from its context alone. Pure. */
export function chatKindOf(context: ChatContext): ChatKind {
  switch (context.type) {
    case 'PROJECT':
      return 'project'
    case 'PROJECT_TOPIC':
      return processRunIdOfChatContext(context) ? 'run' : 'topic'
    case 'STORY':
      return 'story'
    case 'FEATURE':
      return 'feature'
    case 'AGENT_RUN_STORY':
    case 'AGENT_RUN_FEATURE':
      return 'run'
    case 'FEATURE_REQUEST':
      return 'request'
    case 'GROUP':
    case 'GROUP_TOPIC':
      return 'group'
    default:
      return 'assistant'
  }
}

/** Everything a chat's messages cost, as one cost. Undefined when none measured anything. Pure. */
export function chatMessagesCost(
  messages: readonly Pick<ChatMessageLike, 'usage' | 'model'>[],
): CostSource | undefined {
  return messages.reduce<CostSource | undefined>(
    (sum, m) => (m.usage ? addCost(sum, messageUsageCost(m.usage, m.model)) : sum),
    undefined,
  )
}

function storyRef(input: ChatHeaderInput, storyId: string): string {
  const idx = input.storyDisplayIndex?.(storyId)
  return `#${typeof idx === 'number' ? idx : storyId.slice(0, 6)}`
}

function featureRef(input: ChatHeaderInput, storyId: string, featureId: string): string {
  const idx = input.featureDisplayIndex?.(storyId, featureId)
  return `${storyRef(input, storyId)}.${typeof idx === 'number' ? idx : featureId.slice(0, 6)}`
}

function isAgentRun(context: ChatContext): boolean {
  return context.type === 'AGENT_RUN_STORY' || context.type === 'AGENT_RUN_FEATURE'
}

function fallbackTitle(input: ChatHeaderInput): string {
  return formatChatTitle({
    context: input.context,
    ...(input.chatTitle !== undefined ? { chatTitle: input.chatTitle } : {}),
    ...(input.projectName !== undefined ? { projectName: input.projectName } : {}),
    ...(input.groupName !== undefined ? { groupName: input.groupName } : {}),
    ...(input.storyDisplayIndex ? { storyDisplayIndex: input.storyDisplayIndex } : {}),
    ...(input.featureDisplayIndex ? { featureDisplayIndex: input.featureDisplayIndex } : {}),
  })
}

function headerTitle(input: ChatHeaderInput, kind: ChatKind): string {
  const { context, story, feature, run } = input
  if (kind === 'run' && !isAgentRun(context)) {
    return run?.title ?? (input.chatTitle?.trim() || CHAT_KIND_VIEW.run.label)
  }
  if (kind === 'story' && story && context.storyId) {
    return `Story ${storyRef(input, context.storyId)} · ${story.title}`
  }
  if (kind === 'feature' && feature && context.storyId && context.featureId) {
    return `Feature ${featureRef(input, context.storyId, context.featureId)} · ${feature.title}`
  }
  if (kind === 'request') return input.chatTitle?.trim() || CHAT_KIND_VIEW.request.label
  return fallbackTitle(input)
}

function headerPill(input: ChatHeaderInput, kind: ChatKind): ChatHeaderPill | undefined {
  if (kind === 'assistant') return input.listHidden ? CHAT_HEADER_ARCHIVED_PILL : undefined
  if (kind === 'run' && input.run) return processRunBadge(input.run, input.now)
  const work = kind === 'story' ? input.story : kind === 'feature' ? input.feature : undefined
  return work ? { label: statusLabel(work.status), tone: storyStatusTone(work.status) } : undefined
}

function runStepName(input: ChatHeaderInput): string | undefined {
  if (!input.run) return undefined
  return processRunStripEntries(input.run).find((e) => e.phase === 'current')?.label
}

function headerContext(input: ChatHeaderInput, kind: ChatKind): string {
  const { context, story, run } = input
  const project = input.projectName ?? ''
  switch (kind) {
    case 'run': {
      const storyId = run?.storyId ?? context.storyId
      const where = storyId ? `Story ${storyRef(input, storyId)}` : run?.plan.name
      return [where, runStepName(input)].filter(Boolean).join(' · ') || project
    }
    case 'story': {
      const features = story?.features ?? []
      if (features.length === 0) return project
      const done = features.filter((f) => f.status === 'done').length
      return `${done} of ${features.length} feature${features.length === 1 ? '' : 's'} done`
    }
    case 'feature': {
      if (!context.storyId) return project
      const ref = `Story ${storyRef(input, context.storyId)}`
      return story ? `${ref} · ${story.title}` : ref
    }
    case 'group':
      if (context.type === 'GROUP_TOPIC') return input.groupName ?? CHAT_KIND_VIEW.group.label
      return input.groupProjectCount === undefined
        ? CHAT_KIND_VIEW.group.label
        : `Group · ${input.groupProjectCount} project${input.groupProjectCount === 1 ? '' : 's'}`
    case 'assistant':
      return CHAT_HEADER_ASSISTANT_CONTEXT
    default:
      return project
  }
}

function headerStrip(input: ChatHeaderInput, kind: ChatKind): StepsStripModel | undefined {
  const { context, story, feature, run } = input
  if (kind === 'run' && run) {
    const entries = processRunStripEntries(run, processRunStopHolder(run, input.now))
    return entries.length > 0 ? { label: STEPS_STRIP_LABELS.steps, entries } : undefined
  }
  if (kind === 'story' && story && context.storyId) {
    const storyId = context.storyId
    const entries = storyStripEntries(story, (id) => featureRef(input, storyId, id))
    return entries.length > 0 ? { label: STEPS_STRIP_LABELS.features, entries } : undefined
  }
  if (kind === 'feature' && feature) {
    const entries = featureStripEntries(feature)
    return entries.length > 0 ? { label: STEPS_STRIP_LABELS.doneWhen, entries } : undefined
  }
  return undefined
}

/**
 * What a chat's header shows, from whatever the host has read: the kind tile
 * and its name, the title, the status pill of the run, story or feature the chat
 * is about, the line saying where it sits, a run's working time, the cost — the
 * run's spend for a run chat, the chat's own messages otherwise — and the steps,
 * features or done-when criteria strip under it. A run chat whose run is not
 * read yet shows its stored title and nothing it cannot know. Pure.
 */
export function chatHeaderView(input: ChatHeaderInput): ChatHeaderView {
  const kind = chatKindOf(input.context)
  const { run } = input
  const runChat = kind === 'run' && !isAgentRun(input.context) ? run : undefined
  const workMs = runChat ? processRunWorkMs(runChat, input.now) : undefined
  const timeDetails =
    workMs !== undefined
      ? processTimeDetailsView(runChat?.totals?.time, workMs, runChat?.totals?.manager)
      : undefined
  const spend = runChat ? processRunSpend(runChat) : undefined
  const chatCost = runChat ? undefined : costChipLabel(input.messagesCost)
  const pill = headerPill(input, kind)
  const strip = headerStrip(input, kind)
  return {
    kind,
    kindLabel: isAgentRun(input.context) ? CHAT_AGENT_RUN_KIND_LABEL : CHAT_KIND_VIEW[kind].label,
    title: headerTitle(input, kind),
    ...(pill ? { pill } : {}),
    context: headerContext(input, kind),
    ...(runChat && workMs !== undefined
      ? {
          duration: {
            label: formatProcessDuration(workMs),
            ...(timeDetails ? { details: timeDetails } : {}),
            title: CHAT_HEADER_RUN_TIME_TITLE,
          },
        }
      : {}),
    ...(spend
      ? {
          cost: {
            label: spend.label,
            ...(runChat?.totals ? { cost: runChat.totals } : {}),
            title: spend.title,
          },
        }
      : chatCost !== undefined
        ? {
            cost: {
              label: chatCost,
              ...(input.messagesCost ? { cost: input.messagesCost } : {}),
              title: CHAT_HEADER_CHAT_COST_TITLE,
            },
          }
        : {}),
    ...(strip ? { strip } : {}),
  }
}
