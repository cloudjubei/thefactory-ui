import type { ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import {
  GROUP_TICKET_PAGE_TEXT as TEXT,
  GROUP_TICKET_TAB_ACTION_LABELS,
  GROUP_TICKETS_TEXT,
  REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  REVIEW_REPLY_TEXT,
  REVIEW_START_TEXT,
  type GroupTicketPageLayout,
  type GroupTicketPageState,
  type GroupTicketPageView,
  type GroupTicketTabAction,
  type ReviewCardMerge,
  type ReviewReplyBannerLayout,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconExternalLink } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import { MergeSection } from '../chat/ColleagueReviewCard'
import TicketChip from '../chips/TicketChip'
import ToneBadge from '../chips/ToneBadge'
import { GroupStoryChip } from './GroupStoryBits'
import ReviewReplyBanner from './ReviewReplyBanner'

export type GroupTicketPageActions = {
  onDiscuss: () => void
  onTake: () => void
  /** Open the paste box on the ticket. */
  onReview: () => void
  /** Open the group story working the ticket: Carry on. */
  onOpenStory: (groupStoryId: string) => void
  /** Open one part's story of the group story. */
  onOpenPartStory: (projectId: string, storyId: string) => void
  /** Open a review run's page. */
  onOpenRun: (projectId: string, runId: string) => void
  onOpenChat: (context: ChatContext) => void
  onRetry: () => void
  /** Approve the round's pull requests and merge them. */
  onApproveAndMerge?: (slackText: string, override: boolean) => void
}

export type GroupTicketPageProps = GroupTicketPageActions & {
  state: GroupTicketPageState
  /** What is opening the ticket's chat right now. */
  starting?: 'discuss' | 'plan' | undefined
  /** A chat is opening on any ticket. */
  busy?: boolean
  startError?: string | undefined
  /** What Review says while a round starts. */
  reviewing?: string | undefined
  /** Approve & merge on the review's latest round. */
  merge?: ReviewCardMerge | undefined
  /** A phone shows one column whatever layout is asked. */
  layout?: GroupTicketPageLayout
  /** How a reply waiting on the review shows: a strip under the header, or a line in it. */
  replyLayout?: ReviewReplyBannerLayout
  /** Start with the whole reply showing — for a fixed showcase state. */
  replyExpanded?: boolean
}

/**
 * Native peer of web's `GroupTicketPage`: one ticket's page, pushed from its
 * row — the ticket and its facts, its updates from Slack, its review with its
 * runs, its pull requests, its group story and chats, and its tab's actions.
 * A part that could not be read is a quiet line; the rest still shows.
 */
export default function GroupTicketPage({
  state,
  layout: _oneColumn,
  replyLayout = REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  replyExpanded = false,
  ...props
}: GroupTicketPageProps) {
  const { theme } = useNativeTheme()
  const note = { fontSize: 13, color: theme.text.secondary }
  if (state.kind === 'loading') {
    return <Text style={[note, { padding: nativeSpace[3] }]}>{TEXT.loading}</Text>
  }
  if (state.kind === 'failed') {
    return (
      <View style={{ gap: nativeSpace[2], padding: nativeSpace[3] }}>
        <Alert variant="error">{state.error}</Alert>
        <View style={{ alignItems: 'flex-start' }}>
          <Button size="sm" variant="secondary" onPress={props.onRetry}>
            {TEXT.tryAgain}
          </Button>
        </View>
      </View>
    )
  }
  const { page } = state
  const { liveRun, reviewChat } = page
  const banner = (
    <ReviewReplyBanner
      reply={page.reply}
      commits={page.commits}
      layout={replyLayout}
      starting={props.reviewing}
      expanded={replyExpanded}
      onStart={props.onReview}
      {...(liveRun ? { onOpenRun: () => props.onOpenRun(liveRun.projectId, liveRun.id) } : {})}
      {...(reviewChat ? { onOpenChat: () => props.onOpenChat(reviewChat) } : {})}
    />
  )
  return (
    <View style={{ gap: nativeSpace[4], padding: nativeSpace[3] }}>
      <Header
        page={page}
        refreshing={state.refreshing}
        {...(replyLayout === 'line' ? { banner } : {})}
        {...props}
      />
      {replyLayout === 'strip' ? banner : null}
      <TicketPart page={page} />
      <UpdatesPart page={page} />
      <ReviewPart page={page} onOpenRun={props.onOpenRun} />
      <WorkPart page={page} {...props} />
    </View>
  )
}

function Part({ heading, children }: { heading: string; children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View accessibilityLabel={heading} style={{ gap: nativeSpace[2] }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {heading}
      </Text>
      {children}
    </View>
  )
}

function Quiet({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return <Text style={{ fontSize: 12, color: theme.text.muted }}>{children}</Text>
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={6}
      onPress={() => void Linking.openURL(href)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}
    >
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: theme.accent.primary }}>
        {children}
      </Text>
      <IconExternalLink size={12} color={theme.accent.primary} />
    </Pressable>
  )
}

function Card({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 6,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
      }}
    >
      {children}
    </View>
  )
}

const ROW = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 } as const

function PageButtons({
  page,
  starting,
  busy = false,
  reviewing,
  onDiscuss,
  onTake,
  onReview,
  onOpenStory,
  onOpenChat,
}: Pick<
  GroupTicketPageProps,
  | 'starting'
  | 'busy'
  | 'reviewing'
  | 'onDiscuss'
  | 'onTake'
  | 'onReview'
  | 'onOpenStory'
  | 'onOpenChat'
> & { page: GroupTicketPageView }) {
  const button = (action: GroupTicketTabAction) => {
    switch (action) {
      case 'take':
        return (
          <Button
            key={action}
            size="sm"
            variant="primary"
            loading={starting === 'plan'}
            disabled={busy}
            onPress={onTake}
          >
            {starting === 'plan'
              ? GROUP_TICKETS_TEXT.starting
              : GROUP_TICKET_TAB_ACTION_LABELS.take}
          </Button>
        )
      case 'carry-on': {
        const story = page.story
        return story ? (
          <Button key={action} size="sm" variant="secondary" onPress={() => onOpenStory(story.id)}>
            {GROUP_TICKET_TAB_ACTION_LABELS['carry-on']}
          </Button>
        ) : null
      }
      case 'review':
        return (
          <Button
            key={action}
            size="sm"
            variant="secondary"
            disabled={reviewing !== undefined}
            onPress={onReview}
          >
            {reviewing !== undefined ? <Spinner size={12} /> : null}
            {reviewing ?? (page.review ? REVIEW_START_TEXT.nextRound : REVIEW_START_TEXT.review)}
          </Button>
        )
      case 'discuss':
        return (
          <Button
            key={action}
            size="sm"
            variant="secondary"
            loading={starting === 'discuss'}
            disabled={busy}
            onPress={onDiscuss}
          >
            {starting === 'discuss' ? GROUP_TICKETS_TEXT.opening : GROUP_TICKETS_TEXT.discuss}
          </Button>
        )
      default:
        return null
    }
  }
  const actions: GroupTicketTabAction[] = page.actions.includes('discuss')
    ? page.actions
    : [...page.actions, 'discuss']
  const { reviewChat } = page
  return (
    <View style={ROW}>
      {actions.map(button)}
      {reviewChat ? (
        <Button size="sm" variant="ghost" onPress={() => onOpenChat(reviewChat)}>
          {REVIEW_REPLY_TEXT.openChat}
        </Button>
      ) : null}
    </View>
  )
}

function Header({
  page,
  refreshing,
  banner,
  merge,
  onApproveAndMerge,
  startError,
  ...actions
}: Omit<GroupTicketPageProps, 'state' | 'layout' | 'replyLayout' | 'replyExpanded'> & {
  page: GroupTicketPageView
  refreshing: boolean
  banner?: ReactNode
}) {
  const { theme } = useNativeTheme()
  const offersMerge = page.actions.includes('approve-and-merge') && merge !== undefined
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={ROW}>
        <TicketChip view={page.chip} />
        {page.tabName ? <GroupStoryChip label={page.tabName} /> : null}
        {refreshing ? <Spinner size={12} /> : null}
        {page.url ? (
          <View style={{ marginLeft: 'auto' }}>
            <ExternalLink href={page.url}>{TEXT.openInJira}</ExternalLink>
          </View>
        ) : null}
      </View>
      {page.summary ? (
        <Text
          accessibilityRole="header"
          style={{ fontSize: 18, fontWeight: '600', lineHeight: 24, color: theme.text.primary }}
        >
          {page.summary}
        </Text>
      ) : null}
      <PageButtons page={page} {...actions} />
      {banner}
      {startError ? <Alert variant="error">{startError}</Alert> : null}
      {offersMerge ? (
        <MergeSection
          merge={merge}
          {...(onApproveAndMerge ? { onStart: onApproveAndMerge } : {})}
        />
      ) : null}
      {page.problems.length > 0 ? (
        <View style={{ gap: 2 }}>
          {page.problems.map((line) => (
            <Quiet key={line}>{line}</Quiet>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function TicketPart({ page }: { page: GroupTicketPageView }) {
  const { theme } = useNativeTheme()
  if (page.facts.length === 0 && page.description === undefined) return null
  return (
    <Part heading={TEXT.ticket}>
      {page.facts.length > 0 ? (
        <View style={{ gap: 4 }}>
          {page.facts.map((fact) => (
            <View key={fact.label} style={{ flexDirection: 'row', gap: nativeSpace[3] }}>
              <Text style={{ width: 84, fontSize: 13, color: theme.text.muted }}>{fact.label}</Text>
              <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{fact.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {page.description !== undefined ? (
        <Card>
          <Text selectable style={{ fontSize: 13, color: theme.text.primary }}>
            {page.description}
          </Text>
        </Card>
      ) : null}
    </Part>
  )
}

function UpdatesPart({ page }: { page: GroupTicketPageView }) {
  const { theme } = useNativeTheme()
  return (
    <Part heading={TEXT.updates}>
      {page.emptyLines.updates ? <Quiet>{page.emptyLines.updates}</Quiet> : null}
      {page.updates.map((update) => (
        <Card key={update.id}>
          <View style={ROW}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
              {update.label}
            </Text>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>{update.when}</Text>
            <ToneBadge tone={update.state.tone} label={update.state.label} />
            {update.permalink ? (
              <View style={{ marginLeft: 'auto' }}>
                <ExternalLink href={update.permalink}>{TEXT.open}</ExternalLink>
              </View>
            ) : null}
          </View>
          {update.files.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {update.files.map((name, at) => (
                <GroupStoryChip key={`${name}-${at}`} label={name} />
              ))}
            </View>
          ) : null}
          {update.links.map((link) => (
            <ExternalLink key={link} href={link}>
              {link}
            </ExternalLink>
          ))}
        </Card>
      ))}
    </Part>
  )
}

function ReviewPart({
  page,
  onOpenRun,
}: {
  page: GroupTicketPageView
  onOpenRun: (projectId: string, runId: string) => void
}) {
  const { theme } = useNativeTheme()
  const { review } = page
  return (
    <Part heading={TEXT.review}>
      {page.emptyLines.review ? <Quiet>{page.emptyLines.review}</Quiet> : null}
      {review ? (
        <>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{review.findings}</Text>
          {review.rounds.map((round) => (
            <Card key={round.n}>
              <View style={ROW}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                  {round.label}
                </Text>
                {round.verdict ? (
                  <ToneBadge tone={round.verdict.tone} label={round.verdict.label} />
                ) : null}
                <Text style={{ fontSize: 12, color: theme.text.muted }}>{round.when}</Text>
              </View>
              {round.reply ? (
                round.reply.permalink ? (
                  <ExternalLink href={round.reply.permalink}>{round.reply.label}</ExternalLink>
                ) : (
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                    {round.reply.label}
                  </Text>
                )
              ) : null}
              {round.merged ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{round.merged}</Text>
              ) : null}
            </Card>
          ))}
          {review.runs.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Quiet>{TEXT.runs}</Quiet>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {review.runs.map((run) => (
                  <Pressable
                    key={run.id}
                    accessibilityRole="button"
                    onPress={() => onOpenRun(run.projectId, run.id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: nativeRadii[2],
                      borderWidth: 1,
                      borderColor: theme.border.subtle,
                      backgroundColor: pressed ? theme.surface.hover : theme.surface.raised,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    })}
                  >
                    <Text style={{ fontSize: 12, color: theme.text.primary }}>{run.label}</Text>
                    <ToneBadge tone={run.status.tone} label={run.status.label} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </Part>
  )
}

function WorkPart({
  page,
  onOpenStory,
  onOpenPartStory,
  onOpenChat,
}: Pick<GroupTicketPageActions, 'onOpenStory' | 'onOpenPartStory' | 'onOpenChat'> & {
  page: GroupTicketPageView
}) {
  const { theme } = useNativeTheme()
  const { story } = page
  const press = (onPress: () => void, children: ReactNode, key?: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.hover : theme.surface.raised,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: 6,
      })}
    >
      {children}
    </Pressable>
  )
  return (
    <>
      <Part heading={TEXT.pullRequests}>
        {page.emptyLines.pullRequests ? <Quiet>{page.emptyLines.pullRequests}</Quiet> : null}
        {page.pullRequests.map((pr) => (
          <View key={pr.url} style={{ gap: 4 }}>
            <View style={ROW}>
              <ExternalLink href={pr.url}>{pr.name}</ExternalLink>
              <ToneBadge tone={pr.state.tone} label={pr.state.label} />
              {pr.checks ? <ToneBadge tone={pr.checks.tone} label={pr.checks.label} /> : null}
            </View>
            <Text numberOfLines={2} style={{ fontSize: 12, color: theme.text.secondary }}>
              {pr.title}
            </Text>
          </View>
        ))}
      </Part>
      <Part heading={TEXT.story}>
        {page.emptyLines.story ? <Quiet>{page.emptyLines.story}</Quiet> : null}
        {story ? (
          <View style={{ gap: 6 }}>
            {press(
              () => onOpenStory(story.id),
              <Text
                style={{ flex: 1, fontSize: 13, fontWeight: '500', color: theme.accent.primary }}
              >
                {story.title}
              </Text>,
            )}
            {story.parts.map((part) =>
              press(
                () => onOpenPartStory(part.projectId, part.storyId),
                <>
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>{part.projectId}</Text>
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontSize: 13, color: theme.text.primary }}
                  >
                    {part.title ?? part.storyId}
                  </Text>
                  {part.status ? (
                    <Text style={{ fontSize: 12, color: theme.text.muted }}>{part.status}</Text>
                  ) : null}
                </>,
                `${part.projectId}/${part.storyId}`,
              ),
            )}
          </View>
        ) : null}
      </Part>
      <Part heading={TEXT.chats}>
        {page.emptyLines.chats ? <Quiet>{page.emptyLines.chats}</Quiet> : null}
        {page.chats.map((chat, at) =>
          press(
            () => onOpenChat(chat.context),
            <>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>
                {chat.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{chat.when}</Text>
            </>,
            `${chat.title}-${at}`,
          ),
        )}
      </Part>
    </>
  )
}
