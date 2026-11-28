import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import {
  reviewMergeChecksShown,
  reviewMergeChecksView,
  type ReviewMergeChecksSnapshot,
} from 'thefactory-ui/headless'
import { SlackReviewSettingsPanel } from '../../src/native/compound/settings/GroupSlackSettings'
import { ReviewMergeChecksPanel } from '../../src/native/compound/settings/ReviewMergeChecks'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { MERGE_CHECKS_STATES, mergeChecksSnapshot } from '../scenes/reviewMergeChecksFixtures'
import { SOURCE_SETTINGS_SET, slackSettings } from '../scenes/slackReviewFixtures'
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

/** The snapshot with a tick laid over it at once, as the store does. */
function useTicks(start: ReviewMergeChecksSnapshot) {
  const [snapshot, setSnapshot] = useState(start)
  const onRequired = (repository: string, check: string, required: boolean) =>
    setSnapshot({
      ...snapshot,
      checks: reviewMergeChecksShown(snapshot.checks, [{ repository, check, required }]),
    })
  return { view: reviewMergeChecksView(snapshot), onRequired }
}

function Checks({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'mixed'
  const inSettings = state === 'in-settings'
  const { view, onRequired } = useTicks(
    inSettings ? mergeChecksSnapshot() : (MERGE_CHECKS_STATES[state] ?? mergeChecksSnapshot()),
  )
  return (
    <Phone>
      {inSettings ? (
        <SlackReviewSettingsPanel
          state={slackSettings({ status: SOURCE_SETTINGS_SET })}
          mergeChecks={view}
          onCheckRequired={onRequired}
          onClientIdChange={noop}
          onSignIn={noop}
          onSignInAgain={noop}
          onWatch={noop}
          onClear={noop}
          onSkipStatuses={noop}
          onStartReaction={noop}
          onRunChecksUnasked={noop}
          onDefaultMode={noop}
          onMergedTicketStatus={noop}
        />
      ) : (
        <ReviewMergeChecksPanel view={view} onRequired={onRequired} />
      )}
    </Phone>
  )
}

/**
 * The checks a group's merges wait for, on mobile, at `?view=review-merge-checks&state=…`:
 * mixed, saving, loading, none, not-read, read-failed, refused, in-settings — as the web scene.
 */
export const REVIEW_MERGE_CHECKS_VIEWS: readonly NativeView[] = [
  { id: 'review-merge-checks', title: 'Checks to merge', render: (a) => <Checks address={a} /> },
]
