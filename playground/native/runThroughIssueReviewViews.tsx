import { useEffect, useRef } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { runThroughIssueReviewEntry } from 'thefactory-ui/headless'
import { useRunThroughIssueReviewOnPage } from '../../src/native/compound/process/RunThroughIssueReview'
import RunThroughIssueReviewEntry from '../../src/native/compound/process/RunThroughIssueReviewEntry'
import RunThroughIssueReviewPanel from '../../src/native/compound/process/RunThroughIssueReviewPanel'
import RunNeedsYouCard from '../../src/native/compound/process/RunNeedsYouCard'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { OverlayProvider } from '../../src/native/primitives/Overlay'
import { OnFixtures } from '../scenes/onFixtures'
import {
  ISSUE_REVIEW_REPORT,
  ISSUE_REVIEW_SOME_AT,
  ISSUE_REVIEW_STATES,
  issueReviewRoutes,
  issueReviewRun,
  type IssueReviewState,
} from '../scenes/runThroughIssueReviewFixtures'
import type { NativeView } from './views'

/** The run screen at its sign-off, with the full-screen panel opened over it as the state asks. */
function RunScreen({ state }: { state: IssueReviewState }) {
  const { theme, status } = useNativeTheme()
  const run = useRef(issueReviewRun(state)).current
  const { review, projectName } = useRunThroughIssueReviewOnPage(run, ISSUE_REVIEW_REPORT)
  const started = useRef(false)
  useEffect(() => {
    if (started.current || state === 'closed') return
    started.current = true
    review.open()
    if (state === 'some') review.goTo(ISSUE_REVIEW_SOME_AT)
    if (state === 'creating') review.finish()
  }, [review, state])
  return (
    <ScrollView style={{ backgroundColor: theme.surface.base }}>
      <View style={{ padding: 12, width: 390, maxWidth: '100%', gap: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
          {run.title}
        </Text>
        {state === 'closed' ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: status.done.softBorder,
              backgroundColor: status.done.softBg,
            }}
          >
            <RunThroughIssueReviewEntry
              entry={runThroughIssueReviewEntry(run, 0)}
              projectName={projectName}
            />
          </View>
        ) : (
          <RunNeedsYouCard
            style={{ marginHorizontal: 0, marginTop: 0 }}
            tone="review"
            where={<Text style={{ color: theme.text.secondary }}>Sign-off</Text>}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
              The run-through flagged {ISSUE_REVIEW_REPORT.issues.length} issues
            </Text>
            <RunThroughIssueReviewEntry
              entry={review.entry}
              projectName={projectName}
              onStart={review.open}
            />
          </RunNeedsYouCard>
        )}
      </View>
      <RunThroughIssueReviewPanel
        review={review}
        projectId={run.projectId}
        projectName={projectName}
        {...(ISSUE_REVIEW_REPORT.recording ? { recording: ISSUE_REVIEW_REPORT.recording } : {})}
        onDiscuss={() => undefined}
      />
    </ScrollView>
  )
}

const stateOf = (address: URLSearchParams): IssueReviewState =>
  ISSUE_REVIEW_STATES.find((s) => s === address.get('state')) ?? 'first'

export const RUN_THROUGH_ISSUE_REVIEW_VIEWS: readonly NativeView[] = [
  {
    id: 'run-through-issue-review',
    title: 'Run-through issue review (?state=first|some|ready|creating|closed, ?theme=dark)',
    render: (address) => {
      const state = stateOf(address)
      return (
        <OnFixtures routes={issueReviewRoutes(state)}>
          <OverlayProvider>
            <View style={{ flex: 1 }}>
              <RunScreen state={state} />
            </View>
          </OverlayProvider>
        </OnFixtures>
      )
    },
  },
]
