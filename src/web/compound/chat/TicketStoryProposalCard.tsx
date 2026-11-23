import { useState, type ReactNode } from 'react'
import { useChatActions } from '../../../headless/contexts/ChatActionsContext'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { useTicketLinks } from '../../../headless/contexts/TicketLinksContext'
import { ticketChipView } from '../../../headless/utils/groupTickets'
import { collapsedMessage } from '../../../headless/utils/sendChatMessageView'
import { ticketLinkOf } from '../../../headless/utils/ticketLinks'
import {
  ticketStoryFeaturesFold,
  ticketStoryProposalView,
} from '../../../headless/utils/ticketStoryProposal'
import {
  TICKET_STORY_DESCRIPTION_FOLD_CHARS,
  TICKET_STORY_DESCRIPTION_FOLD_LINES,
  TICKET_STORY_PROPOSAL_DEFAULT_LAYOUT,
  TICKET_STORY_PROPOSAL_TEXT,
} from '../../../headless/utils/ticketStoryProposalConstants'
import type {
  TicketStoryFeatureView,
  TicketStoryPartView,
  TicketStoryProposalLayout,
  TicketStoryProposalView,
} from '../../../headless/utils/ticketStoryProposalTypes'
import { IconChevronDown } from '../../icons'
import Markdown from '../Markdown'
import ProjectChip from '../chips/ProjectChip'
import TicketChip from '../chips/TicketChip'
import TicketLinkChip from '../chips/TicketLinkChip'
import RunWaitCard from '../process/RunWaitCard'

const NOTE_TONE: Record<TicketStoryProposalView['outcome'], string> = {
  asking: 'text-(--text-secondary)',
  creating: 'text-(--text-secondary)',
  created: 'text-(--status-done-soft-fg)',
  refused: 'text-(--status-stuck-soft-fg)',
  declined: 'text-(--text-secondary)',
  cancelled: 'text-(--text-secondary)',
}

const LABEL = 'text-[10px] font-semibold tracking-wider text-(--text-muted) uppercase'

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
  /** Start with every part's features listed whole and each one opened — for a fixed showcase state. */
  defaultFeaturesOpen?: boolean
}

function FeatureItem({
  feature,
  at,
  defaultOpen,
}: {
  feature: TicketStoryFeatureView
  at: number
  defaultOpen: boolean
}) {
  const hasMore = feature.description !== undefined || feature.criteria.length > 0
  const [open, setOpen] = useState(defaultOpen && hasMore)
  const head = (
    <>
      <span className="w-4 shrink-0 text-right text-[11px] text-(--text-muted) tabular-nums">
        {at}.
      </span>
      <span className="min-w-0 flex-1 break-words text-(--text-primary)">{feature.title}</span>
      {hasMore ? (
        <IconChevronDown
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-(--text-muted) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      ) : null}
    </>
  )
  return (
    <li className="flex min-w-0 flex-col gap-1">
      {hasMore ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className="flex min-w-0 items-start gap-1.5 rounded-sm text-left hover:bg-(--surface-muted)"
        >
          {head}
        </button>
      ) : (
        <div className="flex min-w-0 items-start gap-1.5">{head}</div>
      )}
      {open ? (
        <div className="ml-[22px] flex min-w-0 flex-col gap-1.5 text-(--text-secondary)">
          {feature.description ? (
            <div className="max-w-full min-w-0 overflow-x-auto">
              <Markdown text={feature.description} />
            </div>
          ) : null}
          {feature.criteria.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={LABEL}>{TICKET_STORY_PROPOSAL_TEXT.doneWhen}</span>
              <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4">
                {feature.criteria.map((criterion, i) => (
                  <li key={i} className="break-words">
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function PartFeatures({
  features,
  planning,
  defaultOpen,
}: {
  features: readonly TicketStoryFeatureView[]
  planning: boolean
  defaultOpen: boolean
}) {
  const [whole, setWhole] = useState(defaultOpen)
  if (features.length === 0) {
    return planning ? (
      <span className="text-[11.5px] text-(--text-muted)">
        {TICKET_STORY_PROPOSAL_TEXT.noFeatures}
      </span>
    ) : null
  }
  const fold = ticketStoryFeaturesFold(features.length, whole)
  const folds = ticketStoryFeaturesFold(features.length, false).more > 0
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <ol
        aria-label={TICKET_STORY_PROPOSAL_TEXT.features(features.length)}
        className="m-0 flex w-full min-w-0 list-none flex-col gap-1 p-0"
      >
        {features.slice(0, fold.shown).map((feature, at) => (
          <FeatureItem key={at} feature={feature} at={at + 1} defaultOpen={defaultOpen} />
        ))}
      </ol>
      {folds ? (
        <button
          type="button"
          aria-expanded={whole}
          onClick={(e) => {
            e.stopPropagation()
            setWhole((v) => !v)
          }}
          className="ml-[22px] text-[11.5px] text-(--accent-primary) hover:underline"
        >
          {whole
            ? TICKET_STORY_PROPOSAL_TEXT.showLess
            : TICKET_STORY_PROPOSAL_TEXT.moreFeatures(fold.more)}
        </button>
      ) : null}
    </div>
  )
}

function PartBlock({
  part,
  renderStory,
  planning,
  featuresOpen,
}: {
  part: TicketStoryPartView
  renderStory: TicketStoryProposalCardProps['renderStory']
  planning: boolean
  featuresOpen: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <PartRow part={part} renderStory={renderStory} />
      {part.wait || part.features.length > 0 || planning ? (
        <div className="ml-2 flex min-w-0 flex-col gap-1.5 border-l border-(--border-subtle) pl-2.5">
          {part.wait ? <RunWaitCard compact view={part.wait} /> : null}
          <PartFeatures features={part.features} planning={planning} defaultOpen={featuresOpen} />
        </div>
      ) : null}
    </div>
  )
}

function PartRow({
  part,
  renderStory,
}: {
  part: TicketStoryPartView
  renderStory: TicketStoryProposalCardProps['renderStory']
}) {
  const { story } = part
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <ProjectChip label={part.projectTitle} nonActionable />
      {story.kind === 'new' ? (
        <>
          <span className="shrink-0 rounded-full border border-(--border-subtle) px-1.5 py-px text-[10.5px] text-(--text-secondary)">
            {TICKET_STORY_PROPOSAL_TEXT.newStory}
          </span>
          {story.title ? (
            <span className="min-w-0 break-words text-(--text-primary)">{story.title}</span>
          ) : null}
        </>
      ) : (
        (renderStory?.(part.projectId, story.storyId, story.title) ?? (
          <span className="min-w-0 break-words text-(--text-primary)">
            {story.title ?? TICKET_STORY_PROPOSAL_TEXT.existingStory}
          </span>
        ))
      )}
    </div>
  )
}

/**
 * The group story an agent proposes for a ticket, on its ask and on its tool
 * row: the ticket's chip, the title, the description as formatted text folded
 * past a few lines, a row per part (the project, and a new story or the one it
 * already has) with what it waits for and its features in build order — each
 * opening to its description and what makes it done, a long list folded behind
 * "N more" — and the order the parts run in said plainly. Once approved it
 * names the group story that was made, opens it, and says it is ready to run;
 * a refusal is one plain line.
 */
export default function TicketStoryProposalCard({
  view,
  layout = TICKET_STORY_PROPOSAL_DEFAULT_LAYOUT,
  renderStory,
  onOpenGroupStory,
  defaultExpanded = false,
  defaultFeaturesOpen = false,
}: TicketStoryProposalCardProps) {
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
  const partOf = (key: string) => view.parts.find((p) => p.key === key)
  const planning = view.outcome !== 'created'
  const block = (part: TicketStoryPartView) => (
    <PartBlock
      key={part.key}
      part={part}
      renderStory={renderStory}
      planning={planning}
      featuresOpen={defaultFeaturesOpen}
    />
  )
  return (
    <div className="flex min-w-0 flex-col gap-2.5 text-[12.5px]">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {link ? (
          <TicketLinkChip link={link} />
        ) : view.ticketKey ? (
          <TicketChip view={ticketChipView({ key: view.ticketKey, url: view.ticketUrl })} />
        ) : null}
        <span className="flex-1" />
        <span className={`shrink-0 text-[11.5px] font-medium ${NOTE_TONE[view.outcome]}`}>
          {view.note}
        </span>
      </div>
      <span className="break-words text-[14px] leading-snug font-semibold text-(--text-primary)">
        {view.title}
      </span>
      {view.error ? (
        <span className="break-words text-(--status-stuck-soft-fg)">{view.error}</span>
      ) : null}
      {shown ? (
        <div className="flex min-w-0 flex-col items-start gap-1 text-(--text-secondary)">
          <div className="max-w-full min-w-0 overflow-x-auto">
            <Markdown text={shown} />
          </div>
          {folded !== undefined ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="text-[11.5px] text-(--accent-primary) hover:underline"
            >
              {expanded ? TICKET_STORY_PROPOSAL_TEXT.showLess : TICKET_STORY_PROPOSAL_TEXT.showMore}
            </button>
          ) : null}
        </div>
      ) : null}
      {view.parts.length > 0 && layout === 'steps' ? (
        <div className="flex flex-col gap-2">
          {view.steps.map((step, at) => (
            <div key={at} className="flex flex-col gap-1.5">
              <span className={LABEL}>{TICKET_STORY_PROPOSAL_TEXT.step(at + 1)}</span>
              {step.map((key) => {
                const part = partOf(key)
                return part ? block(part) : null
              })}
            </div>
          ))}
        </div>
      ) : view.parts.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className={LABEL}>{TICKET_STORY_PROPOSAL_TEXT.parts}</span>
          {view.parts.map(block)}
          {view.order ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className={LABEL}>{TICKET_STORY_PROPOSAL_TEXT.order}</span>
              <span className="min-w-0 break-words text-(--text-primary)">{view.order}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {made ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={LABEL}>{TICKET_STORY_PROPOSAL_TEXT.groupStory}</span>
          {onOpenGroupStory ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenGroupStory(made.groupId, made.groupStoryId)
              }}
              className="chip chip--ok max-w-full truncate"
              title={TICKET_STORY_PROPOSAL_TEXT.openGroupStory(made.title)}
            >
              {made.title}
            </button>
          ) : (
            <span className="chip max-w-full truncate" title={made.title}>
              {made.title}
            </span>
          )}
        </div>
      ) : null}
      {view.ready ? (
        <span className="break-words text-(--status-done-soft-fg)">{view.ready}</span>
      ) : null}
    </div>
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
