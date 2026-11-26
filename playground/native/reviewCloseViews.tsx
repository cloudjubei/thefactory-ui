import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { ColleagueReviewCloseOutcome, ProcessRun } from 'thefactory-tools/types'
import { FilesProvider } from 'thefactory-ui/headless'
import { processRunRevivable } from 'thefactory-tools/utils'

import { colleagueReviewCardView } from '../../src/headless/utils/colleagueReviewCard'
import type { ReviewCloseView } from '../../src/headless/utils/colleagueReviewCloseTypes'
import { processRunBadge, processRunPersonEnding } from '../../src/headless/utils/processView'
import { PROCESS_REVIVE_COPY } from '../../src/headless/utils/processViewConstants'
import ColleagueReviewCard from '../../src/native/compound/chat/ColleagueReviewCard'
import ToneBadge from '../../src/native/compound/chips/ToneBadge'
import GroupTicketPage from '../../src/native/compound/groupStories/GroupTicketPage'
import { ReviewCloseControl } from '../../src/native/compound/groupStories/ReviewCloseControl'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { Button } from '../../src/native/primitives/Button'
import { REVIEW_TICKET, ROUND_TWO } from '../scenes/colleagueReviewFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import {
  CLOSE_CONTEXT,
  CLOSE_NOW,
  CLOSE_RUN_ID,
  CLOSE_RUN_ROUTES,
  CLOSE_VIEWS,
  PAGE_RESOLVED,
  REVIEW_RESOLVED,
  RUN_REMOVED,
  RUN_RESOLVED,
  RUN_RESOLVED_AFTER_FAILED,
  RUN_SELF_SETTLED,
} from '../scenes/reviewCloseFixtures'
import { PAGE_AT_PUSH } from '../scenes/ticketRunFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.base }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ width: 390, maxWidth: '100%', padding: padded ? 12 : 0, gap: 12 }}>
        {children}
      </View>
    </ScrollView>
  )
}

const CONFIRMS: Record<string, ColleagueReviewCloseOutcome> = {
  'confirm-resolved': 'resolved',
  'confirm-remove': 'remove',
}

function control(view: ReviewCloseView, confirmOpen?: ColleagueReviewCloseOutcome) {
  return (
    <ReviewCloseControl
      view={view}
      context={CLOSE_CONTEXT}
      onClose={noop}
      {...(confirmOpen ? { confirmOpen } : {})}
    />
  )
}

function Action({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'idle'
  const confirm = CONFIRMS[state]
  return (
    <Phone>{control(CLOSE_VIEWS[confirm ? 'idle' : state] ?? CLOSE_VIEWS.idle!, confirm)}</Phone>
  )
}

const RUNS: Record<string, ProcessRun> = {
  'run-resolved': RUN_RESOLVED,
  'run-self-settled': RUN_SELF_SETTLED,
  'run-removed': RUN_REMOVED,
  'run-resolved-after-failed': RUN_RESOLVED_AFTER_FAILED,
}

function RunReading({ run }: { run: ProcessRun }) {
  const { theme } = useNativeTheme()
  const badge = processRunBadge(run, CLOSE_NOW)
  const ending = processRunPersonEnding(run)
  return (
    <View
      style={{
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
        {run.title}
      </Text>
      <ToneBadge tone={badge.tone} label={badge.label} />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{ending?.line}</Text>
      {processRunRevivable(run) ? (
        <>
          <Button size="sm" variant="primary" onPress={noop}>
            {PROCESS_REVIVE_COPY.label}
          </Button>
          <Text style={{ fontSize: 10, color: theme.text.secondary }}>
            {PROCESS_REVIVE_COPY.detail}
          </Text>
        </>
      ) : null}
    </View>
  )
}

function Surfaces({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'ticket-page'
  if (state === 'run-page') {
    return (
      <OnFixtures routes={CLOSE_RUN_ROUTES}>
        <FilesProvider>
          <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
            <ProcessPipeline runId={CLOSE_RUN_ID} />
          </View>
        </FilesProvider>
      </OnFixtures>
    )
  }
  const run = RUNS[state]
  if (run) {
    return (
      <Phone>
        <RunReading run={run} />
      </Phone>
    )
  }
  if (state === 'card' || state === 'card-resolved') {
    const resolved = state === 'card-resolved'
    return (
      <Phone>
        <ColleagueReviewCard
          view={colleagueReviewCardView({
            tool: 'record',
            review: resolved ? REVIEW_RESOLVED : ROUND_TWO,
            ticketKey: REVIEW_TICKET,
          })}
          onDrop={noop}
          onGiven={noop}
          close={control(resolved ? CLOSE_VIEWS.resolved! : CLOSE_VIEWS.idle!)}
        />
      </Phone>
    )
  }
  return (
    <Phone padded={false}>
      <GroupTicketPage
        state={state === 'ticket-page-resolved' ? PAGE_RESOLVED : PAGE_AT_PUSH}
        onDiscuss={noop}
        onTake={noop}
        onReview={noop}
        onOpenStory={noop}
        onOpenPartStory={noop}
        onOpenRun={noop}
        onOpenChat={noop}
        onRetry={noop}
        reviewClose={control(
          state === 'ticket-page-resolved' ? CLOSE_VIEWS.resolved! : CLOSE_VIEWS.idle!,
        )}
      />
    </Phone>
  )
}

/** Closing a review on mobile, at `?view=<id>&state=…`, as the web scenes. */
export const REVIEW_CLOSE_VIEWS: readonly NativeView[] = [
  { id: 'review-close', title: 'Close this review', render: (a) => <Action address={a} /> },
  {
    id: 'review-close-surfaces',
    title: 'Close this review: where it sits',
    render: (a) => <Surfaces address={a} />,
  },
]
