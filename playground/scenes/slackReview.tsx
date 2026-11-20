import { useState, type ReactNode } from 'react'
import type { ColleagueReview } from 'thefactory-tools/types'
import {
  ChatActionsProvider,
  DEFAULT_APP_SETTINGS,
  REVIEW_OFFER_DEFAULT_LAYOUT,
  REVIEW_OFFER_LAYOUT_LABELS,
  REVIEW_OFFER_LAYOUTS,
  REVIEW_START_TEXT,
  SLACK_SETTINGS_DEFAULT_LAYOUT,
  SLACK_SETTINGS_LAYOUT_LABELS,
  SLACK_SETTINGS_LAYOUTS,
  colleagueReviewCardView,
  groupTabIndicator,
  groupTicketsView,
  inkBadgeLook,
  inlineReviewDecisionActions,
  parseTicketStatuses,
  reviewDecisionVerdict,
  runReviewDecisionActions,
  startReactionName,
  ticketStatusesText,
  type ChatActions,
  type ColleagueReviewMode,
  type ReviewCardMerge,
  type ReviewDecisionAction,
  type GroupTicketsState,
  type NavRowIndicator,
  type ReviewOfferLayout,
  type ReviewPasteBox,
  type ReviewSettingsView,
  type SlackReviewSettingsState,
  type SlackSettingsLayout,
} from 'thefactory-ui/headless'
import {
  ColleagueReviewCard,
  ColleagueReviewDecisionCard,
  ColleagueReviewPasteForm,
  GroupTicketsList,
  NavIndicator,
  SegmentedControl,
  SlackReviewSettingsPanel,
} from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import { REVIEW_CHAT_ID, REVIEW_GROUP, REVIEW_TICKET, ROUND_TWO } from './colleagueReviewFixtures'
import {
  BOX_FROM_OFFER,
  BOX_OFFER_EDITED,
  BOX_READING_OFFER,
  offeredTickets,
  MERGE_FAILED,
  MERGE_MERGED,
  MERGE_PAST_NOT_REQUIRED,
  MERGE_RUNNING,
  MERGE_WAITING_NOT_REQUIRED,
  REVIEW_RUN_CHOICES,
  ROUND_TWO_POSTED,
  ROUND_TWO_POSTED_EDITED,
  ROUND_TWO_PRS,
  ROUND_TWO_REPLY,
  ROUND_TWO_WITH_PRS,
  roundTwoMerge,
  SLACK_NOW,
  SOURCE_RUNS_BY_DEFAULT,
  SOURCE_NO_BINDING,
  SOURCE_NONE,
  SOURCE_REACTION_FAILED,
  SOURCE_READ_FAILED,
  SOURCE_SETTINGS_SET,
  SOURCE_SIGN_IN_AGAIN,
  slackSettings,
  THREAD_LINK,
} from './slackReviewFixtures'

const noop = () => {}

type Width = 'page' | 'phone'

const frame = (width: Width, children: ReactNode) => (
  <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[760px]'} max-w-full p-4`}>
    {children}
  </div>
)

type SettingsOptions = {
  state?: SlackReviewSettingsState
  layout?: SlackSettingsLayout
  width?: Width
  editingThread?: boolean
  typedLink?: string
  confirmingClear?: boolean
}

/** The settings as the store would show them at once after a change. */
function withSettings(
  state: SlackReviewSettingsState,
  patch: Partial<ReviewSettingsView>,
): SlackReviewSettingsState {
  const { settings } = state.view
  return settings
    ? { ...state, view: { ...state.view, settings: { ...settings, ...patch } } }
    : state
}

function Settings({
  state = slackSettings(),
  layout,
  width = 'page',
  editingThread,
  typedLink,
  confirmingClear,
}: SettingsOptions) {
  const [shown, setShown] = useState(state)
  return frame(
    width,
    <SlackReviewSettingsPanel
      state={shown}
      {...(layout ? { layout } : {})}
      {...(editingThread ? { editingThread } : {})}
      {...(typedLink ? { typedLink } : {})}
      {...(confirmingClear ? { confirmingClear } : {})}
      onClientIdChange={(clientId) => setShown({ ...shown, clientId })}
      onSignIn={noop}
      onSignInAgain={noop}
      onOpenAgain={noop}
      onBackOut={noop}
      onWatch={noop}
      onClear={noop}
      onSkipStatuses={(text) =>
        setShown(
          withSettings(shown, { skipStatuses: ticketStatusesText(parseTicketStatuses(text)) }),
        )
      }
      onStartReaction={(text) =>
        setShown(withSettings(shown, { startReaction: startReactionName(text) }))
      }
      onRunChecksUnasked={(on) => setShown(withSettings(shown, { runChecksUnasked: on }))}
      onDefaultMode={(mode) => setShown(withSettings(shown, { defaultMode: mode }))}
      onMergedTicketStatus={(text) =>
        setShown(withSettings(shown, { mergedTicketStatus: text.trim() }))
      }
    />,
  )
}

const settings = (options: SettingsOptions = {}) => <Settings {...options} />

function ChooseSettingsLayout({ state }: { state: SlackReviewSettingsState }) {
  const [layout, setLayout] = useState<SlackSettingsLayout>(SLACK_SETTINGS_DEFAULT_LAYOUT)
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as SlackSettingsLayout)}
          options={SLACK_SETTINGS_LAYOUTS.map((value) => ({
            value,
            label: SLACK_SETTINGS_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {settings({ state, layout })}
    </div>
  )
}

const SETTINGS_LAYOUT_DESCRIPTIONS: Record<SlackSettingsLayout, string> = {
  steps:
    'Recommended, the default that ships. Two numbered steps: connect Slack, then watch a thread. The order is the setup’s own, the second step reads as waiting until the first is done, and both stay in view once set.',
  card: 'One card with the connection on top and the thread under it. The most compact once set up, but on first use the setup fields and the thread’s “connect first” line share one box with no order shown.',
  rows: 'Classic settings rows, a label on the left. Matches a long settings page, but the redirect URL and the thread link get half the width, and on a phone the rows stack like the steps without their numbers.',
}

const settingsLayoutStates: SceneState[] = SLACK_SETTINGS_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: SLACK_SETTINGS_LAYOUT_LABELS[layout],
    description: SETTINGS_LAYOUT_DESCRIPTIONS[layout],
    render: () => settings({ layout }),
  },
  {
    id: `layout-${layout}-setup`,
    title: `${SLACK_SETTINGS_LAYOUT_LABELS[layout]}, before Slack is connected`,
    render: () =>
      settings({
        layout,
        state: slackSettings({ connections: [], status: SOURCE_NONE }),
      }),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${SLACK_SETTINGS_LAYOUT_LABELS[layout]}, on a phone`,
    render: () => settings({ layout, width: 'phone' }),
  },
])

const NOT_CONNECTED_INPUT = { connections: [], status: SOURCE_NONE }

const NOT_CONNECTED = slackSettings(NOT_CONNECTED_INPUT)

/** The group's tab rows as the sidebar draws them, Tickets with its badge. */
function TabRows({ offers }: { offers: number }) {
  const look = inkBadgeLook(DEFAULT_APP_SETTINGS.userPreferences)
  const colors = DEFAULT_APP_SETTINGS.notifications.badgeColors
  const chats = { unread: 0, waiting: 0, thinking: false }
  const row = (label: string, indicator: NavRowIndicator, active = false) => (
    <div
      key={label}
      className="relative flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
      style={{
        background: active ? 'var(--color-brand-50)' : 'transparent',
        color: active ? 'var(--color-brand-700)' : 'inherit',
      }}
    >
      <span className="flex-1 truncate">{label}</span>
      <NavIndicator indicator={indicator} badgeColors={colors} look={look} />
    </div>
  )
  return (
    <div className="w-[240px] p-4">
      <div className="flex flex-col rounded-md border border-(--border-subtle) bg-(--surface-raised) py-1">
        {row('Home', groupTabIndicator('home', chats))}
        {row('Stories', groupTabIndicator('stories', chats))}
        {row('Tickets', groupTabIndicator('tickets', chats, [], 0, offers))}
        {row('Chat', groupTabIndicator('chat', chats))}
      </div>
    </div>
  )
}

type TicketOptions = {
  state?: GroupTicketsState
  offerLayout?: ReviewOfferLayout
  width?: Width
}

function Tickets({ state = offeredTickets(), offerLayout, width = 'page' }: TicketOptions) {
  const list = (
    <GroupTicketsList
      view={groupTicketsView(state, SLACK_NOW)}
      query=""
      onQueryChange={noop}
      onDiscuss={noop}
      onPlan={noop}
      onOpen={noop}
      onPickTab={noop}
      onReview={noop}
      onDismissOffer={noop}
      onOpenStory={noop}
      onOpenSettings={noop}
      onRetry={noop}
      onLoadMore={noop}
      {...(offerLayout ? { offerLayout } : {})}
    />
  )
  return width === 'phone' ? <div className="w-[390px] max-w-full">{list}</div> : list
}

const tickets = (options: TicketOptions = {}) => <Tickets {...options} />

function ChooseOfferLayout() {
  const [layout, setLayout] = useState<ReviewOfferLayout>(REVIEW_OFFER_DEFAULT_LAYOUT)
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as ReviewOfferLayout)}
          options={REVIEW_OFFER_LAYOUTS.map((value) => ({
            value,
            label: REVIEW_OFFER_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {tickets({ offerLayout: layout })}
    </div>
  )
}

const OFFER_LAYOUT_DESCRIPTIONS: Record<ReviewOfferLayout, string> = {
  strip:
    'Recommended, the default that ships. A tinted line under the row says who sent the update and when, with its Slack message and Dismiss. Review opens the paste box filled from it, and the row keeps its width on a phone. Seen at a glance in a long sprint, and room for the link without crowding the row’s chips.',
  chip: 'A chip among the row’s own chips, its × dismissing it. The shortest rows, but the Slack link is gone and the chip wraps oddly beside a long story chip on a phone.',
  button:
    'Only the Review button changes: primary, a dot and Review update, an × beside it. The quietest, but who sent it and when hides behind a hover, which a phone does not have.',
}

const offerLayoutStates: SceneState[] = REVIEW_OFFER_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: REVIEW_OFFER_LAYOUT_LABELS[layout],
    description: OFFER_LAYOUT_DESCRIPTIONS[layout],
    render: () => tickets({ offerLayout: layout }),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${REVIEW_OFFER_LAYOUT_LABELS[layout]}, on a phone`,
    render: () => tickets({ offerLayout: layout, width: 'phone' }),
  },
])

/** A paste box's body framed as the modal draws it. */
function Box({
  box,
  width = 'page',
  mode: startMode = 'inline',
}: {
  box: ReviewPasteBox
  width?: Width
  mode?: ColleagueReviewMode
}) {
  const [shown, setShown] = useState(box)
  const [mode, setMode] = useState<ColleagueReviewMode>(startMode)
  return (
    <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[32rem]'} max-w-full p-4`}>
      <div className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-4">
        <h2 className="m-0 text-[15px] font-semibold text-(--text-primary)">
          {shown.nextRound
            ? REVIEW_START_TEXT.nextTitle(shown.ticketKey)
            : REVIEW_START_TEXT.title(shown.ticketKey)}
        </h2>
        <ColleagueReviewPasteForm
          box={shown}
          now={SLACK_NOW}
          onChange={(draft) => setShown({ ...shown, draft })}
          mode={mode}
          onModeChange={setMode}
          onStart={noop}
        />
      </div>
    </div>
  )
}

const CHAT: ChatActions = {
  openReview: noop,
  reviewTargetOf: () => undefined,
  draftMessage: noop,
  groupId: REVIEW_GROUP,
  chatContextId: REVIEW_CHAT_ID,
}

type CardOptions = {
  review?: ColleagueReview
  thread?: boolean
  posting?: boolean
  postConfirm?: boolean
  width?: Width
  actionError?: string
  merge?: ReviewCardMerge
  mergeConfirm?: boolean
}

function Card({
  review = ROUND_TWO,
  thread = true,
  posting = false,
  postConfirm = false,
  width = 'page',
  actionError,
  merge,
  mergeConfirm = false,
}: CardOptions) {
  const view = colleagueReviewCardView({
    tool: 'record',
    review,
    ticketKey: REVIEW_TICKET,
    thread,
    pending: { drops: new Set(), givens: new Set(), posts: new Set(posting ? [2] : []) },
    ...(actionError ? { actionError } : {}),
  })
  return (
    <ChatActionsProvider value={CHAT}>
      <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[720px]'} max-w-full p-4`}>
        <div className="rounded-md border border-(--border-subtle) bg-(--surface-overlay) text-sm">
          <div className="px-3 py-2 font-semibold text-(--text-primary)">
            recordColleagueReviewRound
          </div>
          <div className="border-t border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
            <ColleagueReviewCard
              view={view}
              onDrop={noop}
              onGiven={noop}
              onPost={noop}
              {...(postConfirm ? { postConfirm } : {})}
              {...(merge ? { merge, onApproveAndMerge: noop } : {})}
              {...(mergeConfirm ? { mergeConfirm } : {})}
            />
          </div>
        </div>
      </div>
    </ChatActionsProvider>
  )
}

const card = (options: CardOptions = {}) => <Card {...options} />

const mergeCard = (merge: ReviewCardMerge, options: CardOptions = {}) =>
  card({ review: ROUND_TWO_WITH_PRS, merge, ...options })

type DecisionOptions = {
  run?: boolean
  width?: Width
  loading?: boolean
  choosing?: string
  error?: string
  typedReply?: string
  noting?: boolean
  confirming?: 'stop' | 'merge'
}

const RUN_ACTIONS: ReviewDecisionAction[] = runReviewDecisionActions(REVIEW_RUN_CHOICES)

/** The decision card in the composer's place, or inside a run's "Needs you" frame. */
function Decision({ run = false, width = 'page', loading = false, ...rest }: DecisionOptions) {
  const verdict = loading ? undefined : reviewDecisionVerdict(ROUND_TWO_WITH_PRS)
  const body = (
    <ColleagueReviewDecisionCard
      ticketKey={REVIEW_TICKET}
      {...(verdict ? { verdict } : {})}
      loading={loading}
      draft={ROUND_TWO_REPLY}
      actions={run ? RUN_ACTIONS : inlineReviewDecisionActions()}
      prs={ROUND_TWO_PRS}
      onChoose={noop}
      {...(run ? { embedded: true } : { onLater: noop })}
      {...(rest.choosing ? { choosing: rest.choosing } : {})}
      {...(rest.error ? { error: rest.error } : {})}
      {...(rest.typedReply ? { typedReply: rest.typedReply } : {})}
      {...(rest.noting ? { noting: rest.noting } : {})}
      {...(rest.confirming ? { confirming: rest.confirming } : {})}
    />
  )
  return (
    <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[720px]'} max-w-full p-4`}>
      {run ? (
        <div className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
            Needs you · Your approval
          </span>
          {body}
        </div>
      ) : (
        <div className="rounded-lg border border-(--border-subtle) bg-(--surface-base)">{body}</div>
      )}
    </div>
  )
}

const decision = (options: DecisionOptions = {}) => <Decision {...options} />

export const SLACK_REVIEW_SCENES: Scene[] = [
  {
    id: 'slack-settings',
    title: 'Slack in group Settings',
    component: 'GroupSlackSettings · SlackReviewSettingsPanel',
    group: 'Settings',
    description:
      'Settings → Group → Slack: the person connects their own Slack app (its Client ID, the redirect URL to add to it with Copy, Sign in in the browser), then pastes the link of the review thread the group watches. Once set it says whether replies become updates (ready, or why not), when it was last read and how that went, and what it brought; Change and Clear (with a confirm). Under them, Review settings: ticket statuses whose updates are skipped, the emoji added to an update once its review starts, and whether review chats run pull request checks without asking — each saved at once, shown at once, and put back with the reason when refused. Three layouts on the board; Two steps ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts, connected with a thread that is ready.',
        render: () => <ChooseSettingsLayout state={slackSettings()} />,
      },
      {
        id: 'choose-layout-setup',
        title: 'Pick a layout, before Slack is connected',
        render: () => <ChooseSettingsLayout state={NOT_CONNECTED} />,
      },
      ...settingsLayoutStates,
      {
        id: 'not-connected',
        title: 'Not connected',
        description:
          'Why Slack needs an app of the person’s own, its Client ID, the redirect URL to copy into it, and Sign in, held until the Client ID looks right.',
        render: () => settings({ state: NOT_CONNECTED }),
      },
      {
        id: 'client-id-typed',
        title: 'Client ID typed',
        render: () =>
          settings({
            state: slackSettings({ ...NOT_CONNECTED_INPUT, clientId: '1234567890.9876543210' }),
          }),
      },
      {
        id: 'client-id-wrong',
        title: 'A Client ID that is not one',
        render: () =>
          settings({ state: slackSettings({ ...NOT_CONNECTED_INPUT, clientId: 'xoxp-1234' }) }),
      },
      {
        id: 'cannot-sign-in',
        title: 'This server cannot sign in to Slack',
        render: () =>
          settings({ state: slackSettings({ ...NOT_CONNECTED_INPUT, oauthSetup: {} }) }),
      },
      {
        id: 'signing-in',
        title: 'Signing in, in the browser',
        description: 'It moves on by itself once Slack sends the person back.',
        render: () =>
          settings({
            state: slackSettings({
              ...NOT_CONNECTED_INPUT,
              clientId: '1234567890.9876543210',
              signIn: {
                step: 'waiting',
                page: 'https://slack.com/oauth/v2/authorize',
                signInId: 's1',
                error: null,
              },
            }),
          }),
      },
      {
        id: 'sign-in-declined',
        title: 'A sign-in that was declined',
        render: () =>
          settings({
            state: slackSettings({
              ...NOT_CONNECTED_INPUT,
              clientId: '1234567890.9876543210',
              signIn: { step: 'ready', error: 'The sign-in was declined in the browser.' },
            }),
          }),
      },
      {
        id: 'connected',
        title: 'Connected, no thread yet',
        description: 'The workspace, then the thread link to paste.',
        render: () => settings({ state: slackSettings({ status: SOURCE_NONE }) }),
      },
      {
        id: 'link-typed',
        title: 'A thread link typed',
        render: () =>
          settings({ state: slackSettings({ status: SOURCE_NONE }), typedLink: THREAD_LINK }),
      },
      {
        id: 'link-wrong',
        title: 'A link that is not a Slack message',
        render: () =>
          settings({
            state: slackSettings({ status: SOURCE_NONE }),
            typedLink: 'https://acme.atlassian.net/browse/OSC-402',
          }),
      },
      {
        id: 'thread-ready',
        title: 'Watching a thread: ready',
        description: 'Read two minutes ago; what it brought so far.',
        render: () => settings(),
      },
      {
        id: 'thread-saving',
        title: 'A thread being saved',
        description: 'Shown at once while the backend checks Slack can read it.',
        render: () =>
          settings({
            state: slackSettings({
              status: SOURCE_NONE,
              pending: { kind: 'watch', connectionId: 'slack-1', permalink: THREAD_LINK },
            }),
          }),
      },
      {
        id: 'thread-refused',
        title: 'A thread Slack cannot read',
        description: 'Rolled back with the backend’s reason, the link kept to fix and try again.',
        render: () =>
          settings({
            state: slackSettings({
              status: SOURCE_NONE,
              actionError: 'Slack cannot read that thread: not_in_channel. Join the channel first.',
            }),
            typedLink: THREAD_LINK,
          }),
      },
      {
        id: 'thread-no-binding',
        title: 'Not offering: no Jira connection',
        render: () => settings({ state: slackSettings({ status: SOURCE_NO_BINDING }) }),
      },
      {
        id: 'thread-read-failed',
        title: 'The last read failed',
        render: () => settings({ state: slackSettings({ status: SOURCE_READ_FAILED }) }),
      },
      {
        id: 'sign-in-again',
        title: 'Slack asked to sign in again',
        description: 'The connection and the thread both say so; Sign in again renews it in place.',
        render: () => settings({ state: slackSettings({ status: SOURCE_SIGN_IN_AGAIN }) }),
      },
      {
        id: 'settings-set',
        title: 'Review settings filled in',
        description:
          'Two statuses skipped, the eyes reaction, checks run without asking, and a merged ticket moved to In QA. A field saves when it is left, on Enter, or with Save, which shows while it is changed.',
        render: () => settings({ state: slackSettings({ status: SOURCE_SETTINGS_SET }) }),
      },
      {
        id: 'settings-as-run',
        title: 'Reviews start as a run',
        description:
          'Start reviews set to As a run: the paste box opens on As a run, still switchable per round.',
        render: () => settings({ state: slackSettings({ status: SOURCE_RUNS_BY_DEFAULT }) }),
      },
      {
        id: 'settings-reaction-failed',
        title: 'A reaction Slack would not add',
        description:
          'The last read could not add the reaction: one muted line under the field says why. Usually a missing reactions:write scope.',
        render: () => settings({ state: slackSettings({ status: SOURCE_REACTION_FAILED }) }),
      },
      {
        id: 'settings-refused',
        title: 'A setting the backend refused',
        description: 'Put back at once, with the backend’s reason on top.',
        render: () =>
          settings({
            state: slackSettings({
              status: SOURCE_SETTINGS_SET,
              actionError: 'The reaction must be an emoji name, like eyes.',
            }),
          }),
      },
      {
        id: 'settings-phone',
        title: 'Review settings, on a phone',
        render: () =>
          settings({ state: slackSettings({ status: SOURCE_REACTION_FAILED }), width: 'phone' }),
      },
      {
        id: 'changing',
        title: 'Changing the thread',
        render: () => settings({ editingThread: true }),
      },
      {
        id: 'clear-confirm',
        title: 'Clearing the thread',
        description: 'Clear asks first; updates already offered stay.',
        overlay: true,
        render: () => settings({ confirmingClear: true }),
      },
      {
        id: 'phone-not-connected',
        title: 'Not connected, on a phone',
        render: () => settings({ state: NOT_CONNECTED, width: 'phone' }),
      },
      {
        id: 'phone-ready',
        title: 'Watching a thread, on a phone',
        render: () => settings({ width: 'phone' }),
      },
    ],
  },
  {
    id: 'slack-review-offers',
    title: 'Updates from Slack on Tickets',
    component: 'GroupTicketsList (onDismissOffer, offerLayout) · groupTabIndicator',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'A reply in the group’s watched Slack thread naming a ticket waits on that ticket as an update: the Tickets tab’s badge counts them, and the row says who sent it and when. Review update opens the paste box filled from it; Dismiss takes it off at once. Three ways to show it on a row; A line under the row ships.',
    states: [
      {
        id: 'tab-badge',
        title: 'The Tickets tab’s badge',
        description: 'Two updates wait, in the colour new tickets use.',
        render: () => <TabRows offers={2} />,
      },
      {
        id: 'tab-no-badge',
        title: 'No updates waiting',
        render: () => <TabRows offers={0} />,
      },
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        render: () => <ChooseOfferLayout />,
      },
      ...offerLayoutStates,
      {
        id: 'dismiss-failed',
        title: 'A dismiss that did not go through',
        description: 'The update is back on its row, with the backend’s reason.',
        render: () =>
          tickets({
            state: offeredTickets({ offerError: 'That update was started already.' }),
          }),
      },
      {
        id: 'starting',
        title: 'A round starting from an update',
        description:
          'At once after Start: the update leaves its row, the row shows the round starting.',
        render: () =>
          tickets({
            state: offeredTickets({ reviewing: { 'OSC-402': { step: 'starting' } } }),
          }),
      },
    ],
  },
  {
    id: 'slack-review-paste',
    title: 'Review paste box from Slack',
    component: 'ColleagueReviewPasteBox',
    group: 'Project',
    description:
      'Review update opens the paste box filled with the update’s text, editable, with who sent it and its Slack message, and the files it came with listed as coming from Slack — the backend fetches them itself. Start sends the update by its id with the person’s edit; pressing it twice starts one round.',
    states: [
      {
        id: 'filled',
        title: 'Filled from an update',
        render: () => <Box box={BOX_FROM_OFFER} />,
      },
      {
        id: 'reading',
        title: 'While the update is read',
        description: 'The box opens at once; Start waits for the text.',
        render: () => <Box box={BOX_READING_OFFER} />,
      },
      {
        id: 'edited',
        title: 'Edited, with a file of the person’s own',
        render: () => <Box box={BOX_OFFER_EDITED} />,
      },
      {
        id: 'failed',
        title: 'A file Slack would not give',
        description: 'The box comes back with the backend’s reason and the person’s edit.',
        render: () => (
          <Box
            box={{
              ...BOX_OFFER_EDITED,
              error: 'weekly-email-outlook.png could not be fetched from Slack.',
            }}
          />
        ),
      },
      {
        id: 'mode-inline',
        title: 'Reviewed in chat',
        description:
          'The default unless the group starts reviews as a run: the round runs in the ticket’s review chat and ends on the decision card.',
        render: () => <Box box={BOX_FROM_OFFER} mode="inline" />,
      },
      {
        id: 'mode-process',
        title: 'Reviewed as a run',
        description:
          'Preselected when the group starts reviews as a run. Start opens the run; its approval is where the person decides.',
        render: () => <Box box={BOX_FROM_OFFER} mode="process" />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => <Box box={BOX_FROM_OFFER} width="phone" />,
      },
    ],
  },
  {
    id: 'slack-review-post',
    title: 'Post in thread',
    component: 'ColleagueReviewCard (onPost)',
    group: 'Chat',
    description:
      'Beside Copy on the review card’s reply, while the group watches a working Slack thread: Post in thread asks first, the reply in a box the person may edit; Post is held while the box is empty, and sends the edit only when it differs from the draft. Once posted, the card links to the message and shows what was posted, the edit when there was one; Post again goes through the same confirm. Without a working thread only Copy shows, as before.',
    states: [
      {
        id: 'can-post',
        title: 'Post in thread beside Copy',
        render: () => card(),
      },
      {
        id: 'confirm',
        title: 'The confirm, the reply editable',
        description:
          'Prefilled with the drafted reply; edit it before posting, or post it as it is.',
        overlay: true,
        render: () => card({ postConfirm: true }),
      },
      {
        id: 'posting',
        title: 'Posting',
        description: 'At once after Post; pressing again does nothing.',
        render: () => card({ posting: true }),
      },
      {
        id: 'posted',
        title: 'Posted in thread',
        description: 'A link to the posted message; Post again stays a press away.',
        render: () => card({ review: ROUND_TWO_POSTED }),
      },
      {
        id: 'posted-edited',
        title: 'Posted after an edit',
        description: 'The card shows the text that was posted, not the draft; Copy copies it too.',
        render: () => card({ review: ROUND_TWO_POSTED_EDITED }),
      },
      {
        id: 'confirm-again',
        title: 'Posting again',
        overlay: true,
        render: () => card({ review: ROUND_TWO_POSTED, postConfirm: true }),
      },
      {
        id: 'post-failed',
        title: 'A post Slack refused',
        render: () => card({ actionError: 'Slack refused the reply: channel_not_found.' }),
      },
      {
        id: 'no-thread',
        title: 'No working thread',
        description: 'Copy alone, and the hint to post it yourself.',
        render: () => card({ thread: false }),
      },
      {
        id: 'posted-no-thread',
        title: 'Posted, the thread since cleared',
        description: 'The link stays; posting again waits for a working thread.',
        render: () => card({ review: ROUND_TWO_POSTED, thread: false }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => card({ review: ROUND_TWO_POSTED, width: 'phone' }),
      },
    ],
  },
  {
    id: 'review-decision',
    title: 'Review decision card',
    component: 'ColleagueReviewDecisionCard · ColleagueReviewDecisionPanel · RunReviewDecisionCard',
    group: 'Chat',
    description:
      'The end of a review round, the same card in two places: in the review chat, in the composer’s place, when the agent asks with its draft; and at a review run’s approval. The round’s verdict, the reply in a box to edit, and the choice: Send in Slack, Approve & merge (asks first, listing the pull requests), Keep reviewing (asks for a note), Stop (asks first). The choice shows at once; a refusal hands the card back with why.',
    states: [
      {
        id: 'inline',
        title: 'In the review chat',
        render: () => decision(),
      },
      {
        id: 'inline-edited',
        title: 'The reply edited',
        description: 'Send carries the edit; left as drafted, the draft goes.',
        render: () =>
          decision({ typedReply: 'Thanks Priya, all good now. Merging once the checks pass.' }),
      },
      {
        id: 'inline-empty',
        title: 'The reply emptied',
        description: 'Send in Slack is held until there is a reply.',
        render: () => decision({ typedReply: ' ' }),
      },
      {
        id: 'keep-reviewing',
        title: 'Keep reviewing',
        description: 'A note is required: what the agent looks at next.',
        render: () => decision({ noting: true }),
      },
      {
        id: 'merge-confirm',
        title: 'Approve & merge asks first',
        overlay: true,
        render: () => decision({ confirming: 'merge' }),
      },
      {
        id: 'stop-confirm',
        title: 'Stop asks first',
        overlay: true,
        render: () => decision({ confirming: 'stop' }),
      },
      {
        id: 'sending',
        title: 'Sending',
        description: 'At once after Send in Slack; the rest is held.',
        render: () => decision({ choosing: 'send-reply' }),
      },
      {
        id: 'refused',
        title: 'A choice that did not go through',
        render: () => decision({ error: 'That ask was already answered on another device.' }),
      },
      {
        id: 'loading',
        title: 'While the round is read',
        render: () => decision({ loading: true }),
      },
      {
        id: 'run',
        title: 'At a review run’s approval',
        description:
          'The run’s gate actions as the card’s choices, in its words; only a person answers.',
        render: () => decision({ run: true }),
      },
      {
        id: 'run-keep-reviewing',
        title: 'Sending a run’s round back',
        render: () => decision({ run: true, noting: true }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => decision({ width: 'phone' }),
      },
    ],
  },
  {
    id: 'review-merge',
    title: 'Approve & merge',
    component: 'ColleagueReviewCard (merge, onApproveAndMerge)',
    group: 'Chat',
    description:
      'On the review card’s latest recorded round: Approve & merge asks first, listing the round’s pull requests in the order they merge (the backend’s first) and the Slack line posted once they all merged — empty means the group’s merged message. Then each pull request’s progress, live, and what came of it. A round that asked for changes is held with the backend’s words and Merge anyway.',
    states: [
      {
        id: 'offered',
        title: 'Offered on the latest round',
        render: () => mergeCard(roundTwoMerge()),
      },
      {
        id: 'confirm',
        title: 'The confirm',
        overlay: true,
        render: () => mergeCard(roundTwoMerge(), { mergeConfirm: true }),
      },
      {
        id: 'starting',
        title: 'Starting',
        description: 'At once after the confirm: the pull requests wait their turn.',
        render: () => mergeCard(roundTwoMerge({ starting: { round: 2 } })),
      },
      {
        id: 'running',
        title: 'Merging',
        description: 'The backend’s merged; the next waits for its checks.',
        render: () => mergeCard(roundTwoMerge({ job: MERGE_RUNNING })),
      },
      {
        id: 'merged',
        title: 'Merged',
        description: 'With the Slack message it posted.',
        render: () => mergeCard(roundTwoMerge({ job: MERGE_MERGED })),
      },
      {
        id: 'waiting-not-required',
        title: 'Waiting, a check not required failed',
        description:
          'It waits only for the checks the group requires; one it does not that failed is named, not waited on.',
        render: () => mergeCard(roundTwoMerge({ job: MERGE_WAITING_NOT_REQUIRED })),
      },
      {
        id: 'merged-not-required',
        title: 'Merged past checks not required',
        description:
          'One not required failed, another still ran: each row says so, and all merged.',
        render: () => mergeCard(roundTwoMerge({ job: MERGE_PAST_NOT_REQUIRED })),
      },
      {
        id: 'failed',
        title: 'Stopped',
        description: 'Where it stopped and why; nothing after it was merged.',
        render: () => mergeCard(roundTwoMerge({ job: MERGE_FAILED })),
      },
      {
        id: 'held',
        title: 'The round asked for changes',
        description: 'The backend’s words, and Merge anyway.',
        render: () =>
          mergeCard(
            roundTwoMerge({
              refusal: 'Round 2 asked for changes. Merge anyway to approve and merge it.',
            }),
          ),
      },
      {
        id: 'not-started',
        title: 'A merge that did not start',
        render: () =>
          mergeCard(roundTwoMerge({ actionError: 'GitHub is not connected for acme.' })),
      },
      {
        id: 'phone',
        title: 'Merging, on a phone',
        render: () => mergeCard(roundTwoMerge({ job: MERGE_RUNNING }), { width: 'phone' }),
      },
    ],
  },
]
