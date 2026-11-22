import { useEffect, useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { runThroughIssueReviewEntry } from 'thefactory-ui/headless'
// Not on the package's public surface as used here: the sign-off draws the review itself. The
// showcase reaches into the source for its parts, as the playground renders from source.
import ToneBadge from '../../src/web/compound/chips/ToneBadge'
import RunNeedsYouCard from '../../src/web/compound/process/RunNeedsYouCard'
import { useRunThroughIssueReviewOnPage } from '../../src/web/compound/process/RunThroughIssueReview'
import RunThroughIssueReviewEntry from '../../src/web/compound/process/RunThroughIssueReviewEntry'
import RunThroughIssueReviewPanel from '../../src/web/compound/process/RunThroughIssueReviewPanel'
import type { Scene } from '../showcase/types'
import { OnFixtures } from './onFixtures'
import {
  ISSUE_REVIEW_REPORT,
  ISSUE_REVIEW_SOME_AT,
  issueReviewRoutes,
  issueReviewRun,
  type IssueReviewState,
} from './runThroughIssueReviewFixtures'

/** The run page at its sign-off, with the panel going over the issues opened over it as the state asks. */
function RunPage({ state }: { state: IssueReviewState }) {
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
  const closed = state === 'closed'
  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold text-(--text-primary)">{run.title}</span>
        <ToneBadge tone={closed ? 'done' : 'review'}>{closed ? 'Done' : 'Needs you'}</ToneBadge>
      </div>
      {closed ? (
        <div className="rounded-xl border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-4 py-3 sm:px-5">
          <RunThroughIssueReviewEntry
            entry={runThroughIssueReviewEntry(run, 0)}
            projectName={projectName}
          />
        </div>
      ) : (
        <RunNeedsYouCard
          className=""
          tone="review"
          where={<ToneBadge tone="review">Sign-off</ToneBadge>}
        >
          <div className="text-[17px] font-semibold leading-snug text-(--text-primary)">
            The run-through flagged {ISSUE_REVIEW_REPORT.issues.length} issues
          </div>
          <div className="text-[12.5px] text-(--text-secondary)">
            {ISSUE_REVIEW_REPORT.issuesSummary}
          </div>
          <RunThroughIssueReviewEntry
            entry={review.entry}
            projectName={projectName}
            onStart={review.open}
          />
        </RunNeedsYouCard>
      )}
      <RunThroughIssueReviewPanel
        review={review}
        projectId={run.projectId}
        projectName={projectName}
        {...(ISSUE_REVIEW_REPORT.recording ? { recording: ISSUE_REVIEW_REPORT.recording } : {})}
        onDiscuss={() => undefined}
      />
    </div>
  )
}

const page = (state: IssueReviewState) => (
  <MemoryRouter>
    <OnFixtures routes={issueReviewRoutes(state)}>
      <RunPage state={state} />
    </OnFixtures>
  </MemoryRouter>
)

export const RUN_THROUGH_ISSUE_REVIEW_SCENES: Scene[] = [
  {
    id: 'run-through-issue-review',
    title: 'Run-through issue review',
    component:
      'RunThroughIssueReviewPanel, RunThroughIssueReviewEntry (RunReportReview, StorySignoffReview, RunThroughTab, ProcessPipeline)',
    group: 'Process',
    wide: true,
    description:
      'A run-through parked at its sign-off with issues offers “Go over the issues (N)” in its Needs-you card and at the top of its Run-through tab. It opens a focused panel over the run — the whole screen on a phone — showing one issue at a time: which of how many and how many are answered, a dot per issue (fix filled, not an issue grey, open hollow, a fix in the person’s words ringed; each dot opens its issue), the screenshot with its moment in the recording as an evidence chip, the severity, title, what happened and what was expected, and three big answers: 1 Fix it (a feature to fix it), 2 Not an issue (nothing is made for it), 3 Reply… (the person’s words become the fix’s instruction). The chosen answer is marked; answering is shown at once and moves to the next open issue. Keys 1/2/3 answer, ←/→ move, Esc closes. After the last issue the answers are grouped (open first while any are), each row opens its issue again, and one action — “Create N fixes in <project> and close the run”, or “Close the run” with no fixes — makes a story of the fixes and approves the sign-off. Once done the run shows how it went and the new story as a chip.',
    states: [
      {
        id: 'first',
        title: 'Nothing answered',
        description: 'Opened on the first issue: every dot open, none of the answers marked.',
        overlay: true,
        render: () => page('first'),
      },
      {
        id: 'some',
        title: 'Some answered',
        description:
          'Three of four answered; the issue shown was answered in the person’s words: Reply… is marked and the words show under it; its dot is ringed.',
        overlay: true,
        render: () => page('some'),
      },
      {
        id: 'ready',
        title: 'All answered',
        description:
          'Every issue answered: the answers grouped as Fix and Not an issue, the words of a reply under it, and the action that makes the fixes and closes the run.',
        overlay: true,
        render: () => page('ready'),
      },
      {
        id: 'creating',
        title: 'Creating the fixes',
        description:
          'The action is on its way: its button is busy and pressing again does nothing.',
        overlay: true,
        render: () => page('creating'),
      },
      {
        id: 'closed',
        title: 'Done',
        description:
          'The run is done: it says how the issues were gone over and shows the new story of the fixes as a chip.',
        render: () => page('closed'),
      },
    ],
  },
]
