import { useState, type ReactNode } from 'react'

import {
  GROUP_TICKET_PAGE_DEFAULT_LAYOUT,
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
import { IconExternalLink } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import ReviewTabBar from '../chat/signoff/ReviewTabBar'
import { MergeSection } from '../chat/ColleagueReviewCard'
import TicketChip from '../chips/TicketChip'
import ToneBadge from '../chips/ToneBadge'
import { GroupStoryBackButton } from './GroupStoryBits'
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
  /** Back to the Tickets tab; without it the app bar's back stands in. */
  onBack?: () => void
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
  layout?: GroupTicketPageLayout
  /** The part A tab per part opens on — for a fixed showcase state. */
  partFirst?: PagePart
  /** How a reply waiting on the review shows: a strip above the parts, or a line in the header. */
  replyLayout?: ReviewReplyBannerLayout
  /** Start with the whole reply showing — for a fixed showcase state. */
  replyExpanded?: boolean
}

type PagePart = 'ticket' | 'updates' | 'review' | 'work'

const HEADING = 'm-0 text-[12px] font-semibold uppercase tracking-wider text-(--text-muted)'
const NOTE = 'm-0 text-[12.5px] text-(--text-secondary)'
const QUIET = 'm-0 text-[12px] text-(--text-muted)'
const LINK =
  'inline-flex min-w-0 items-center gap-1 text-(--accent-primary) hover:underline focus:outline-none focus-visible:ring-2'

/**
 * One ticket's page, opened from its row: the ticket and its facts, its
 * updates from Slack, its review with its runs, its pull requests, its group
 * story and chats, and its tab's actions. A part that could not be read is a
 * quiet line; the rest still shows. All a ticket says comes from Jira, Slack
 * or GitHub, so all of it is plain text.
 */
export default function GroupTicketPage({
  state,
  layout = GROUP_TICKET_PAGE_DEFAULT_LAYOUT,
  partFirst = 'ticket',
  replyLayout = REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  replyExpanded = false,
  ...props
}: GroupTicketPageProps) {
  const [part, setPart] = useState<PagePart>(partFirst)
  if (state.kind === 'loading') {
    return (
      <div className="flex flex-col gap-3 p-4">
        {props.onBack ? <GroupStoryBackButton onBack={props.onBack} /> : null}
        <p className={NOTE}>{TEXT.loading}</p>
      </div>
    )
  }
  if (state.kind === 'failed') {
    return (
      <div className="flex flex-col gap-3 p-4">
        {props.onBack ? <GroupStoryBackButton onBack={props.onBack} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Alert variant="error" className="min-w-0 flex-1">
            {state.error}
          </Alert>
          <Button size="sm" variant="secondary" onClick={props.onRetry}>
            {TEXT.tryAgain}
          </Button>
        </div>
      </div>
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
  const parts: Record<PagePart, ReactNode> = {
    ticket: <TicketPart page={page} />,
    updates: <UpdatesPart page={page} />,
    review: <ReviewPart page={page} onOpenRun={props.onOpenRun} />,
    work: <WorkPart page={page} {...props} />,
  }
  return (
    <div className="@container mx-auto flex w-full max-w-5xl flex-col gap-5 p-4">
      <Header
        page={page}
        refreshing={state.refreshing}
        {...(replyLayout === 'line' ? { banner } : {})}
        {...props}
      />
      {replyLayout === 'strip' ? banner : null}
      {layout === 'tabs' ? (
        <>
          <ReviewTabBar<PagePart>
            ariaLabel={page.key}
            active={part}
            onChange={setPart}
            tabs={[
              { id: 'ticket', label: TEXT.ticket, count: undefined },
              { id: 'updates', label: TEXT.slack, count: page.updates.length || undefined },
              { id: 'review', label: TEXT.review, count: page.review?.rounds.length || undefined },
              {
                id: 'work',
                label: TEXT.work,
                count: page.pullRequests.length + page.chats.length || undefined,
              },
            ]}
          />
          {parts[part]}
        </>
      ) : layout === 'columns' ? (
        <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            {parts.ticket}
            {parts.updates}
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            {parts.review}
            {parts.work}
          </div>
        </div>
      ) : (
        <>
          {parts.ticket}
          {parts.updates}
          {parts.review}
          {parts.work}
        </>
      )}
    </div>
  )
}

function Part({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section aria-label={heading} className="flex min-w-0 flex-col gap-2">
      <p role="heading" aria-level={2} className={HEADING}>
        {heading}
      </p>
      {children}
    </section>
  )
}

function ExternalLink({
  href,
  children,
  title,
}: {
  href: string
  children: ReactNode
  title?: string
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" title={title ?? href} className={LINK}>
      <span className="min-w-0 truncate">{children}</span>
      <IconExternalLink className="size-3 shrink-0" />
    </a>
  )
}

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
            onClick={onTake}
          >
            {starting === 'plan'
              ? GROUP_TICKETS_TEXT.starting
              : GROUP_TICKET_TAB_ACTION_LABELS.take}
          </Button>
        )
      case 'carry-on':
        return page.story ? (
          <Button
            key={action}
            size="sm"
            variant="secondary"
            onClick={() => onOpenStory(page.story!.id)}
          >
            {GROUP_TICKET_TAB_ACTION_LABELS['carry-on']}
          </Button>
        ) : null
      case 'review':
        return (
          <Button
            key={action}
            size="sm"
            variant="secondary"
            disabled={reviewing !== undefined}
            aria-busy={reviewing !== undefined || undefined}
            onClick={onReview}
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
            onClick={onDiscuss}
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
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map(button)}
      {reviewChat ? (
        <Button size="sm" variant="secondary" onClick={() => onOpenChat(reviewChat)}>
          {REVIEW_REPLY_TEXT.openChat}
        </Button>
      ) : null}
    </div>
  )
}

function Header({
  page,
  refreshing,
  banner,
  merge,
  onApproveAndMerge,
  onBack,
  startError,
  ...actions
}: Omit<
  GroupTicketPageProps,
  'state' | 'layout' | 'partFirst' | 'replyLayout' | 'replyExpanded'
> & {
  page: GroupTicketPageView
  refreshing: boolean
  banner?: ReactNode
}) {
  const offersMerge = page.actions.includes('approve-and-merge') && merge !== undefined
  return (
    <header className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {onBack ? <GroupStoryBackButton onBack={onBack} /> : null}
        <TicketChip view={page.chip} />
        {page.tabName ? <span className="chip">{page.tabName}</span> : null}
        {refreshing ? <Spinner size={12} /> : null}
        {page.url ? (
          <span className="ml-auto text-[12.5px]">
            <ExternalLink href={page.url}>{TEXT.openInJira}</ExternalLink>
          </span>
        ) : null}
      </div>
      {page.summary ? (
        <p
          role="heading"
          aria-level={1}
          className="m-0 text-[18px] font-semibold leading-snug text-(--text-primary)"
        >
          {page.summary}
        </p>
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
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {page.problems.map((line) => (
            <li key={line} className={QUIET}>
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}

function TicketPart({ page }: { page: GroupTicketPageView }) {
  if (page.facts.length === 0 && page.description === undefined) return null
  return (
    <Part heading={TEXT.ticket}>
      {page.facts.length > 0 ? (
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[12.5px] @xl:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {page.facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="text-(--text-muted)">{fact.label}</dt>
              <dd className="m-0 min-w-0 truncate text-(--text-primary)">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {page.description !== undefined ? (
        <p className="m-0 whitespace-pre-wrap break-words rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[13px] text-(--text-primary)">
          {page.description}
        </p>
      ) : null}
    </Part>
  )
}

function UpdatesPart({ page }: { page: GroupTicketPageView }) {
  return (
    <Part heading={TEXT.updates}>
      {page.emptyLines.updates ? <p className={QUIET}>{page.emptyLines.updates}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {page.updates.map((update) => (
          <li
            key={update.id}
            className="flex min-w-0 flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[12.5px]"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-(--text-primary)">{update.label}</span>
              <span className="text-(--text-muted)">{update.when}</span>
              <ToneBadge tone={update.state.tone}>{update.state.label}</ToneBadge>
              {update.permalink ? (
                <span className="ml-auto">
                  <ExternalLink href={update.permalink}>{TEXT.open}</ExternalLink>
                </span>
              ) : null}
            </div>
            {update.files.length > 0 ? (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {update.files.map((name, at) => (
                  <li
                    key={`${name}-${at}`}
                    className="max-w-[220px] truncate rounded-md border border-(--border-default) px-2 py-0.5 text-[11.5px] text-(--text-secondary)"
                    title={name}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}
            {update.links.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[12px]">
                {update.links.map((link) => (
                  <li key={link} className="min-w-0">
                    <ExternalLink href={link}>{link}</ExternalLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
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
  const { review } = page
  return (
    <Part heading={TEXT.review}>
      {page.emptyLines.review ? <p className={QUIET}>{page.emptyLines.review}</p> : null}
      {review ? (
        <>
          <p className={NOTE}>{review.findings}</p>
          <ul className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-raised) p-0">
            {review.rounds.map((round) => (
              <li
                key={round.n}
                className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-[12.5px]"
              >
                <span className="font-medium text-(--text-primary)">{round.label}</span>
                {round.verdict ? (
                  <ToneBadge tone={round.verdict.tone}>{round.verdict.label}</ToneBadge>
                ) : null}
                <span className="text-(--text-muted)">{round.when}</span>
                {round.reply ? (
                  round.reply.permalink ? (
                    <ExternalLink href={round.reply.permalink}>{round.reply.label}</ExternalLink>
                  ) : (
                    <span className="text-(--text-secondary)">{round.reply.label}</span>
                  )
                ) : null}
                {round.merged ? (
                  <span className="basis-full text-[12px] text-(--text-secondary)">
                    {round.merged}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {review.runs.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[11.5px] text-(--text-muted)">{TEXT.runs}</span>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {review.runs.map((run) => (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => onOpenRun(run.projectId, run.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2 py-1 text-[12px] text-(--text-primary) hover:bg-(--surface-hover)"
                    >
                      {run.label}
                      <ToneBadge tone={run.status.tone}>{run.status.label}</ToneBadge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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
  return (
    <>
      <Part heading={TEXT.pullRequests}>
        {page.emptyLines.pullRequests ? (
          <p className={QUIET}>{page.emptyLines.pullRequests}</p>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {page.pullRequests.map((pr) => (
            <li
              key={pr.url}
              className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]"
            >
              <ExternalLink href={pr.url}>{pr.name}</ExternalLink>
              {pr.title ? (
                <span className="min-w-0 flex-1 truncate text-(--text-secondary)">{pr.title}</span>
              ) : null}
              {pr.state ? <ToneBadge tone={pr.state.tone}>{pr.state.label}</ToneBadge> : null}
              {pr.checks ? <ToneBadge tone={pr.checks.tone}>{pr.checks.label}</ToneBadge> : null}
            </li>
          ))}
        </ul>
      </Part>
      <Part heading={TEXT.story}>
        {page.emptyLines.story ? <p className={QUIET}>{page.emptyLines.story}</p> : null}
        {page.story ? (
          <div className="flex min-w-0 flex-col gap-1 text-[12.5px]">
            <button
              type="button"
              onClick={() => onOpenStory(page.story!.id)}
              className="self-start text-left font-medium text-(--accent-primary) hover:underline"
            >
              {page.story.title}
            </button>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {page.story.parts.map((part) => (
                <li key={`${part.projectId}/${part.storyId}`} className="flex flex-wrap gap-2">
                  <span className="text-(--text-muted)">{part.projectId}</span>
                  <button
                    type="button"
                    onClick={() => onOpenPartStory(part.projectId, part.storyId)}
                    className="min-w-0 truncate text-left text-(--text-primary) hover:underline"
                  >
                    {part.title ?? part.storyId}
                  </button>
                  {part.status ? <span className="text-(--text-muted)">{part.status}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Part>
      <Part heading={TEXT.chats}>
        {page.emptyLines.chats ? <p className={QUIET}>{page.emptyLines.chats}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {page.chats.map((chat, at) => (
            <li key={`${chat.title}-${at}`}>
              <button
                type="button"
                onClick={() => onOpenChat(chat.context)}
                className="flex w-full min-w-0 items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-1.5 text-left text-[12.5px] hover:bg-(--surface-hover)"
              >
                <span className="min-w-0 flex-1 truncate text-(--text-primary)">{chat.title}</span>
                <span className="shrink-0 text-(--text-muted)">{chat.when}</span>
              </button>
            </li>
          ))}
        </ul>
      </Part>
    </>
  )
}
