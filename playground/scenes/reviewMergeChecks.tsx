import { useState, type ReactNode } from 'react'
import {
  reviewMergeChecksShown,
  reviewMergeChecksView,
  type ReviewMergeChecksSnapshot,
} from 'thefactory-ui/headless'
import { ReviewMergeChecksPanel, SlackReviewSettingsPanel } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import { MERGE_CHECKS_STATES, mergeChecksSnapshot } from './reviewMergeChecksFixtures'
import { SOURCE_SETTINGS_SET, slackSettings } from './slackReviewFixtures'

const noop = () => {}

type Width = 'page' | 'phone'

const frame = (width: Width, children: ReactNode) => (
  <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[760px]'} max-w-full p-4`}>
    {children}
  </div>
)

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

function Checks({ start, width }: { start: ReviewMergeChecksSnapshot; width: Width }) {
  const { view, onRequired } = useTicks(start)
  return frame(width, <ReviewMergeChecksPanel view={view} onRequired={onRequired} />)
}

function InSettings({ width }: { width: Width }) {
  const { view, onRequired } = useTicks(mergeChecksSnapshot())
  return frame(
    width,
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
    />,
  )
}

const checks = (state: string, width: Width = 'page') => (
  <Checks start={MERGE_CHECKS_STATES[state]!} width={width} />
)

export const REVIEW_MERGE_CHECKS_SCENES: Scene[] = [
  {
    id: 'review-merge-checks',
    title: 'Checks to merge',
    component: 'ReviewMergeChecksPanel (in SlackReviewSettingsPanel)',
    group: 'Settings',
    description:
      'Settings → Group → Slack, under Review settings: per repository, each check seen on the group’s recent pull requests with a “Required to merge” tick box. Approve & merge, inline or as a run’s step, waits only for the ticked ones; an unticked check that fails or still runs never holds a merge, and the pull request’s progress row says so. Every check is ticked until the person unticks it. A tick shows at once and is put back with why when the save fails. GitHub’s own branch protection still applies.',
    states: [
      {
        id: 'mixed',
        title: 'Two repositories, a flaky check unticked',
        description: 'Tick and untick to see each change shown at once.',
        render: () => checks('mixed'),
      },
      {
        id: 'saving',
        title: 'A tick on its way',
        description: 'Shown at once, dimmed until the backend has it.',
        render: () => checks('saving'),
      },
      {
        id: 'loading',
        title: 'Reading the checks',
        description: 'Reading them asks GitHub for the recent pull requests’ checks.',
        render: () => checks('loading'),
      },
      {
        id: 'none',
        title: 'No checks seen yet',
        render: () => checks('none'),
      },
      {
        id: 'not-read',
        title: 'A repository whose checks could not be read',
        description: 'Why, in GitHub’s words; the other repository still lists its checks.',
        render: () => checks('not-read'),
      },
      {
        id: 'read-failed',
        title: 'The checks could not be read',
        render: () => checks('read-failed'),
      },
      {
        id: 'refused',
        title: 'A tick that was not saved',
        description: 'The tick is back as it was, with why.',
        render: () => checks('refused'),
      },
      {
        id: 'in-settings',
        title: 'In the group’s review settings',
        description:
          'Where it sits: last of Review settings, under the status a merged ticket moves to.',
        render: () => <InSettings width="page" />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => checks('mixed', 'phone'),
      },
    ],
  },
]
