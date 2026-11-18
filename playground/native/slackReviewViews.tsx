import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { ColleagueReview } from 'thefactory-tools/types'
import {
  colleagueReviewCardView,
  groupTicketsView,
  parseTicketStatuses,
  startReactionName,
  ticketStatusesText,
  type ReviewPasteBox,
  type ReviewSettingsView,
  type SlackReviewSettingsState,
} from 'thefactory-ui/headless'
import ColleagueReviewCard from '../../src/native/compound/chat/ColleagueReviewCard'
import { ColleagueReviewPasteForm } from '../../src/native/compound/groupStories/ColleagueReviewPasteBox'
import GroupTicketsList from '../../src/native/compound/groupStories/GroupTicketsList'
import { SlackReviewSettingsPanel } from '../../src/native/compound/settings/GroupSlackSettings'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { REVIEW_TICKET, ROUND_TWO } from '../scenes/colleagueReviewFixtures'
import {
  BOX_FROM_OFFER,
  BOX_READING_OFFER,
  offeredTickets,
  ROUND_TWO_POSTED,
  ROUND_TWO_POSTED_EDITED,
  SLACK_NOW,
  SOURCE_NO_BINDING,
  SOURCE_NONE,
  SOURCE_REACTION_FAILED,
  SOURCE_READ_FAILED,
  SOURCE_SETTINGS_SET,
  SOURCE_SIGN_IN_AGAIN,
  slackSettings,
} from '../scenes/slackReviewFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.base }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

const SETTINGS: Record<string, SlackReviewSettingsState> = {
  'not-connected': slackSettings({ connections: [], status: SOURCE_NONE }),
  'signing-in': slackSettings({
    connections: [],
    status: SOURCE_NONE,
    clientId: '1234567890.9876543210',
    signIn: {
      step: 'waiting',
      page: 'https://slack.com/oauth/v2/authorize',
      signInId: 's1',
      error: null,
    },
  }),
  connected: slackSettings({ status: SOURCE_NONE }),
  'thread-ready': slackSettings(),
  'thread-no-binding': slackSettings({ status: SOURCE_NO_BINDING }),
  'thread-read-failed': slackSettings({ status: SOURCE_READ_FAILED }),
  'sign-in-again': slackSettings({ status: SOURCE_SIGN_IN_AGAIN }),
  'settings-set': slackSettings({ status: SOURCE_SETTINGS_SET }),
  'settings-reaction-failed': slackSettings({ status: SOURCE_REACTION_FAILED }),
  'settings-refused': slackSettings({
    status: SOURCE_SETTINGS_SET,
    actionError: 'The reaction must be an emoji name, like eyes.',
  }),
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

function Settings({ address }: { address: URLSearchParams }) {
  const [state, setState] = useState(
    SETTINGS[address.get('state') ?? 'thread-ready'] ?? slackSettings(),
  )
  return (
    <Phone>
      <SlackReviewSettingsPanel
        state={state}
        onClientIdChange={(clientId) => setState({ ...state, clientId })}
        onSignIn={noop}
        onSignInAgain={noop}
        onOpenAgain={noop}
        onBackOut={noop}
        onWatch={noop}
        onClear={noop}
        onSkipStatuses={(text) =>
          setState(
            withSettings(state, { skipStatuses: ticketStatusesText(parseTicketStatuses(text)) }),
          )
        }
        onStartReaction={(text) =>
          setState(withSettings(state, { startReaction: startReactionName(text) }))
        }
        onRunChecksUnasked={(on) => setState(withSettings(state, { runChecksUnasked: on }))}
      />
    </Phone>
  )
}

function Tickets() {
  const { theme } = useNativeTheme()
  return (
    <View style={{ backgroundColor: theme.surface.base }}>
      <GroupTicketsList
        view={groupTicketsView(offeredTickets(), SLACK_NOW)}
        query=""
        onQueryChange={noop}
        onDiscuss={noop}
        onPlan={noop}
        onReview={noop}
        onDismissOffer={noop}
        onOpenStory={noop}
        onOpenSettings={noop}
        onRetry={noop}
        onLoadMore={noop}
      />
    </View>
  )
}

const BOXES: Record<string, ReviewPasteBox> = {
  filled: BOX_FROM_OFFER,
  reading: BOX_READING_OFFER,
}

function Paste({ address }: { address: URLSearchParams }) {
  const [box, setBox] = useState(BOXES[address.get('state') ?? 'filled'] ?? BOX_FROM_OFFER)
  return (
    <Phone>
      <ColleagueReviewPasteForm
        box={box}
        now={SLACK_NOW}
        onChange={(draft) => setBox({ ...box, draft })}
        onStart={noop}
      />
    </Phone>
  )
}

const POSTS: Record<string, { review: ColleagueReview; posting?: boolean; confirm?: boolean }> = {
  'can-post': { review: ROUND_TWO },
  confirm: { review: ROUND_TWO, confirm: true },
  posting: { review: ROUND_TWO, posting: true },
  posted: { review: ROUND_TWO_POSTED },
  'posted-edited': { review: ROUND_TWO_POSTED_EDITED },
}

function Post({ address }: { address: URLSearchParams }) {
  const shown = POSTS[address.get('state') ?? 'can-post'] ?? { review: ROUND_TWO }
  const view = colleagueReviewCardView({
    tool: 'record',
    ticketKey: REVIEW_TICKET,
    review: shown.review,
    thread: true,
    pending: { drops: new Set(), givens: new Set(), posts: new Set(shown.posting ? [2] : []) },
  })
  return (
    <Phone>
      <ColleagueReviewCard
        view={view}
        onDrop={noop}
        onGiven={noop}
        onPost={noop}
        {...(shown.confirm ? { postConfirm: true } : {})}
      />
    </Phone>
  )
}

/** The Slack part of the colleague review on mobile, at `?view=<id>&state=…`, as the web scenes. */
export const SLACK_REVIEW_VIEWS: readonly NativeView[] = [
  {
    id: 'slack-settings',
    title: 'Slack in group Settings',
    render: (a) => <Settings address={a} />,
  },
  { id: 'slack-review-offers', title: 'Updates from Slack on Tickets', render: () => <Tickets /> },
  {
    id: 'slack-review-paste',
    title: 'Review paste box from Slack',
    render: (a) => <Paste address={a} />,
  },
  { id: 'slack-review-post', title: 'Post in thread', render: (a) => <Post address={a} /> },
]
