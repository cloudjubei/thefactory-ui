import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useChatActions } from '../../../headless/contexts/ChatActionsContext'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { useTicketLinks } from '../../../headless/contexts/TicketLinksContext'
import { ticketChipView } from '../../../headless/utils/groupTickets'
import { collapsedMessage } from '../../../headless/utils/sendChatMessageView'
import { ticketLinkOf } from '../../../headless/utils/ticketLinks'
import { ticketStoryProposalView } from '../../../headless/utils/ticketStoryProposal'
import {
  TICKET_STORY_DESCRIPTION_FOLD_CHARS,
  TICKET_STORY_DESCRIPTION_FOLD_LINES,
  TICKET_STORY_PROPOSAL_DEFAULT_LAYOUT,
  TICKET_STORY_PROPOSAL_TEXT,
} from '../../../headless/utils/ticketStoryProposalConstants'
import type {
  TicketStoryPartView,
  TicketStoryProposalLayout,
  TicketStoryProposalView,
} from '../../../headless/utils/ticketStoryProposalTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Markdown from '../Markdown'
import ProjectChip from '../chips/ProjectChip'
import TicketChip from '../chips/TicketChip'
import TicketLinkChip from '../chips/TicketLinkChip'
import { GroupStoryChip } from '../groupStories/GroupStoryBits'

export type TicketStoryProposalCardProps = {
  view: TicketStoryProposalView
  /** A row per part with the order in a line, or the parts grouped under the step they run in. */
  layout?: TicketStoryProposalLayout
  /** Draws an existing part story, by its project and id: the app's story chip. Without it, its title or that it exists. */
  renderStory?: (projectId: string, storyId: string, title: string | undefined) => ReactNode
  /** Opens the group story that was made. Without it the story is named and opens nothing. */
  onOpenGroupStory?: (groupId: string, groupStoryId: string) => void
  /** Start with a long description unfolded. */
  defaultExpanded?: boolean
}

function Label({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

function PartRow({
  part,
  renderStory,
}: {
  part: TicketStoryPartView
  renderStory: TicketStoryProposalCardProps['renderStory']
}) {
  const { theme } = useNativeTheme()
  const { story } = part
  const drawn =
    story.kind === 'existing'
      ? renderStory?.(part.projectId, story.storyId, story.title)
      : undefined
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <ProjectChip label={part.projectTitle} nonActionable />
      {story.kind === 'new' ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii.round,
            paddingHorizontal: nativeSpace[2],
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {TICKET_STORY_PROPOSAL_TEXT.newStory}
          </Text>
        </View>
      ) : null}
      {drawn ? (
        <Text>{drawn}</Text>
      ) : story.kind === 'existing' || story.title ? (
        <Text style={{ flexShrink: 1, fontSize: 13, color: theme.text.primary }}>
          {story.title ?? TICKET_STORY_PROPOSAL_TEXT.existingStory}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * Native peer of [web's `TicketStoryProposalCard`](../../../web/compound/chat/TicketStoryProposalCard.tsx):
 * the group story an agent proposes for a ticket, on its ask and on its tool
 * row: the ticket's chip, the title, the description folded past a few lines,
 * a row per part, and the order the parts run in said plainly. Once approved it
 * names the group story that was made and opens it; a refusal is one plain line.
 */
export default function TicketStoryProposalCard({
  view,
  layout = TICKET_STORY_PROPOSAL_DEFAULT_LAYOUT,
  renderStory,
  onOpenGroupStory,
  defaultExpanded = false,
}: TicketStoryProposalCardProps) {
  const { theme, status } = useNativeTheme()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const site = useTicketLinks()?.site
  const link = view.ticketUrl ? ticketLinkOf(view.ticketUrl, site) : undefined
  const folded = view.description
    ? collapsedMessage(
        view.description,
        TICKET_STORY_DESCRIPTION_FOLD_CHARS,
        TICKET_STORY_DESCRIPTION_FOLD_LINES,
      )
    : undefined
  const shown = folded !== undefined && !expanded ? folded : view.description
  const made = view.groupStory
  const noteColor =
    view.outcome === 'created'
      ? status.done.softFg
      : view.outcome === 'refused'
        ? status.stuck.softFg
        : theme.text.secondary
  const partOf = (projectId: string) => view.parts.find((p) => p.projectId === projectId)
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {link ? (
          <Text>
            <TicketLinkChip link={link} />
          </Text>
        ) : view.ticketKey ? (
          <TicketChip view={ticketChipView({ key: view.ticketKey, url: view.ticketUrl })} />
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 12, fontWeight: '500', color: noteColor }}>{view.note}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
        {view.title}
      </Text>
      {view.error ? (
        <Text selectable style={{ fontSize: 13, color: status.stuck.softFg }}>
          {view.error}
        </Text>
      ) : null}
      {shown ? (
        <View style={{ gap: 4, alignItems: 'flex-start' }}>
          <Markdown text={shown} textStyle={{ fontSize: 13, color: theme.text.secondary }} />
          {folded !== undefined ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              hitSlop={8}
              onPress={() => setExpanded((v) => !v)}
            >
              <Text style={{ fontSize: 12, color: theme.accent.primary }}>
                {expanded
                  ? TICKET_STORY_PROPOSAL_TEXT.showLess
                  : TICKET_STORY_PROPOSAL_TEXT.showMore}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {view.parts.length > 0 && layout === 'steps' ? (
        <View style={{ gap: 8 }}>
          {view.steps.map((step, at) => (
            <View key={at} style={{ gap: 6 }}>
              <Label>{TICKET_STORY_PROPOSAL_TEXT.step(at + 1)}</Label>
              {step.map((projectId) => {
                const part = partOf(projectId)
                return part ? (
                  <PartRow key={projectId} part={part} renderStory={renderStory} />
                ) : null
              })}
            </View>
          ))}
        </View>
      ) : view.parts.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Label>{TICKET_STORY_PROPOSAL_TEXT.parts}</Label>
          {view.parts.map((part) => (
            <PartRow key={part.projectId} part={part} renderStory={renderStory} />
          ))}
          {view.order ? (
            <View style={{ marginTop: 4, gap: 2 }}>
              <Label>{TICKET_STORY_PROPOSAL_TEXT.order}</Label>
              <Text style={{ fontSize: 13, color: theme.text.primary }}>{view.order}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {made ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Label>{TICKET_STORY_PROPOSAL_TEXT.groupStory}</Label>
          <GroupStoryChip
            label={made.title}
            tone={onOpenGroupStory ? 'ok' : 'neutral'}
            accessibilityLabel={
              onOpenGroupStory ? TICKET_STORY_PROPOSAL_TEXT.openGroupStory(made.title) : made.title
            }
            {...(onOpenGroupStory
              ? { onPress: () => onOpenGroupStory(made.groupId, made.groupStoryId) }
              : {})}
          />
        </View>
      ) : null}
    </View>
  )
}

export type TicketStoryProposalConnectedProps = {
  /** The call's arguments. */
  args?: unknown
  result?: unknown
  resultType?: string
  layout?: TicketStoryProposalLayout
}

/**
 * {@link TicketStoryProposalCard} for a call in a chat, filled in from what the
 * app has loaded and nothing it would have to wait for: project names, the
 * app's story chip for a part's existing story, the ticket's link on the chat's
 * Jira site, and the chat's way to a group story.
 */
export function TicketStoryProposalConnected({
  args,
  result,
  resultType,
  layout,
}: TicketStoryProposalConnectedProps) {
  const projects = useProjectsOptional()?.projects
  const links = useTicketLinks()
  const chat = useChatActions()
  const renderReference = useReferenceRendering()?.renderReference
  const view = ticketStoryProposalView({
    args,
    result,
    ...(resultType !== undefined ? { resultType } : {}),
    ...(projects ? { projects } : {}),
    ...(links ? { siteUrl: links.site.baseUrl } : {}),
  })
  return (
    <TicketStoryProposalCard
      view={view}
      {...(layout ? { layout } : {})}
      {...(renderReference
        ? {
            renderStory: (projectId: string, storyId: string) =>
              renderReference({
                type: 'reference',
                reference: { kind: 'story', projectId, storyId },
              }),
          }
        : {})}
      {...(chat?.openGroupStory ? { onOpenGroupStory: chat.openGroupStory } : {})}
    />
  )
}
