import type { ReactNode } from 'react'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import {
  featureWorkAskView,
  launchOverlapView,
  processAmendmentView,
  processRunStripEntries,
  STEPS_STRIP_LABELS,
} from 'thefactory-ui/headless'
import { StepsStrip } from 'thefactory-ui/web'
// Not on the package's public surface: the launch dock and the sign-off draw these themselves.
// The showcase reaches into the source for them.
import LaunchOverlapNote from '../../src/web/compound/chat/LaunchOverlapNote'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import OutsideScopeNote from '../../src/web/compound/process/signoff/OutsideScopeNote'
import type { Scene } from '../showcase/types'

const noop = () => {}

function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base) p-3">
      {children}
    </div>
  )
}

const LAUNCH = featureWorkAskView({ storyTitle: 'Agent types as data', joinsOpenRun: false })

/** bfcf0aa2 launched while ed34ace8 changed the same workflow files, and dev moved on under both. */
const OVERLAP_RUNS_AND_BASE = launchOverlapView({
  runs: [
    {
      runId: 'ed34ace8',
      title: 'Provenance-aware LLM usage accounting',
      files: [
        'src/workflow/workflowTypes.ts',
        'src/workflow/workflowUtils.ts',
        'src/workflow/ProcessDriver.ts',
      ],
    },
    {
      runId: '4ce9d38c',
      title: 'Retry with a failure brief',
      files: ['src/workflow/ProcessDriver.ts'],
    },
  ],
  base: { baseRef: 'dev', commits: 4, files: ['src/workflow/workflowUtils.ts'] },
})!

const OVERLAP_ONE_RUN = launchOverlapView({
  runs: [
    {
      runId: 'ed34ace8',
      title: 'Provenance-aware LLM usage accounting',
      files: ['src/workflow/workflowTypes.ts'],
    },
  ],
})!

function Launch({ note }: { note?: ReactNode }) {
  return (
    <Dock>
      <ToolAskCard view={LAUNCH} busy={false} onApprove={noop} onDeny={noop} onLater={noop}>
        {note}
      </ToolAskCard>
    </Dock>
  )
}

const done = (id: string, stepId: string, summary: string): ProcessLedgerEntry => ({
  id,
  stepId,
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  endedAt: 1,
  summary,
})

const CONFLICT = {
  baseRef: 'dev',
  baseSha: 'a4d8976'.padEnd(40, '0'),
  commits: 4,
  paths: ['src/workflow/workflowUtils.ts', 'src/tools/generated/ToolSchemas.ts'],
}

/** bfcf0aa2 after its approval: the conflict on merging resolved, checked, and now its resolution reviewed. */
const RESOLUTION_UNDER_REVIEW: ProcessRun = {
  id: 'bfcf0aa2',
  projectId: 'thefactory-tools',
  title: 'Agent types as data',
  status: 'running',
  startedAt: 0,
  updatedAt: 1,
  loopCounts: {},
  cursor: { stepId: 'review-resolution', iteration: 1 },
  plan: {
    definitionId: 'story-default',
    definitionScope: 'global',
    definitionVersion: 8,
    name: 'Story',
    frozenAt: 0,
    steps: [
      { id: 'features', name: 'Features', kind: 'process' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'report', name: 'Report', kind: 'report' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      { id: 'resolve-conflict', name: 'Resolve conflict', kind: 'agent', agentType: 'fixer' },
      { id: 'conflict-checks', name: 'Checks', kind: 'check' },
      { id: 'review-resolution', name: 'Review the resolution', kind: 'judge' },
      { id: 'confirm-landing', name: 'Confirm the merge', kind: 'gate' },
    ],
    loops: [],
    amendments: [
      {
        at: Date.UTC(2026, 9, 13, 9, 43),
        stepIds: ['resolve-conflict', 'conflict-checks', 'confirm-landing'],
        afterStepId: 'sign-off',
        integrationConflict: CONFLICT,
      },
      {
        at: Date.UTC(2026, 9, 14, 22, 38),
        stepIds: ['review-resolution'],
        afterStepId: 'conflict-checks',
        resolutionReview: { conflict: CONFLICT, checksStepId: 'conflict-checks' },
      },
    ],
  },
  ledger: [
    done('l1', 'features', '4 of 4 steps passed.'),
    done('l2', 'code-review', 'Code review: approved'),
    done('l3', 'report', 'Mostly done'),
    done('l4', 'sign-off', ''),
    done('l5', 'resolve-conflict', 'Agent run finished: success.'),
    done('l6', 'conflict-checks', 'Build ✓ · Type check ✓ · Unit tests ✓'),
    {
      id: 'l7',
      stepId: 'review-resolution',
      iteration: 1,
      status: 'running',
      startedAt: 2,
    },
  ],
} as ProcessRun

/** bfcf0aa2's manager committed the two .factory files; its change is checked and reviewed before sign-off. */
const MANAGER_CHANGE_UNDER_REVIEW: ProcessRun = {
  ...RESOLUTION_UNDER_REVIEW,
  cursor: { stepId: 'review-manager-change', iteration: 1 },
  plan: {
    ...RESOLUTION_UNDER_REVIEW.plan,
    steps: [
      { id: 'features', name: 'Features', kind: 'process' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'report', name: 'Report', kind: 'report' },
      { id: 'manager-checks', name: 'Checks', kind: 'check' },
      { id: 'review-manager-change', name: 'Review the manager’s change', kind: 'judge' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    amendments: [
      {
        at: Date.UTC(2026, 9, 12, 8, 30),
        stepIds: ['manager-checks', 'review-manager-change'],
        afterStepId: 'report',
        managerChangeReview: {
          changes: [
            {
              id: 'm1',
              sha: 'eb58614b'.padEnd(40, '0'),
              summary: 'Commit the two .factory/agentTypes files the capture filter dropped',
            },
          ],
        },
      },
    ],
  },
  ledger: [
    done('l1', 'features', '4 of 4 steps passed.'),
    done('l2', 'code-review', 'Code review: approved'),
    done('l3', 'report', 'Mostly done'),
    done('l4', 'manager-checks', 'Build ✓ · Type check ✓ · Unit tests ✓'),
    {
      id: 'l5',
      stepId: 'review-manager-change',
      iteration: 1,
      status: 'running',
      startedAt: 2,
    },
  ],
} as ProcessRun

function AddedReview({ run }: { run: ProcessRun }) {
  return (
    <div className="flex max-w-3xl flex-col gap-2">
      <StepsStrip
        model={{ label: STEPS_STRIP_LABELS.steps, entries: processRunStripEntries(run) }}
      />
      {processAmendmentView(run).notes.map((note) => (
        <div key={note} className="text-[11.5px] text-(--text-secondary)">
          {note}
        </div>
      ))}
    </div>
  )
}

export const WORKFLOW_GUARD_SCENES: Scene[] = [
  {
    id: 'launch-overlap',
    title: 'Launch overlapping other work',
    component: 'LaunchOverlapNote (ApprovalPanel), ToolAskCard',
    group: 'Chat',
    description:
      'The launch card warns when a live run, or the base branch’s new commits since the story’s open run started, touch the files the features name. It never blocks the launch.',
    states: [
      {
        id: 'runs-and-base',
        title: 'Two live runs and the base',
        render: () => <Launch note={<LaunchOverlapNote view={OVERLAP_RUNS_AND_BASE} />} />,
      },
      {
        id: 'one-run',
        title: 'One live run',
        render: () => <Launch note={<LaunchOverlapNote view={OVERLAP_ONE_RUN} />} />,
      },
      {
        id: 'no-overlap',
        title: 'Nothing overlaps',
        description: 'No note at all.',
        render: () => <Launch />,
      },
    ],
  },
  {
    id: 'signoff-outside-scope',
    title: 'Files outside the feature’s scope',
    component: 'OutsideScopeNote (StorySignoffReview)',
    group: 'Process',
    description:
      'At sign-off, the changed files a code review was told lie outside the features’ scope — the manager’s commits included. A note for the person, not a block.',
    states: [
      {
        id: 'outside-scope',
        title: 'Two files outside the scope',
        render: () => (
          <Dock>
            <OutsideScopeNote line="Outside the feature’s scope: src/agentRunner/agentRunnerOrchestrator.ts, docs/FILE_ORGANISATION.md" />
          </Dock>
        ),
      },
    ],
  },
  {
    id: 'added-reviews',
    title: 'Reviews added after approval',
    component: 'StepsStrip, processAmendmentView (ProcessPipeline)',
    group: 'Process',
    description:
      'A conflict resolved after the code review approved gets a review of the resolution alone before the merge is confirmed; a commit by the manager gets checks and a review of its commits before sign-off.',
    states: [
      {
        id: 'resolution-review',
        title: 'Reviewing a conflict’s resolution',
        render: () => <AddedReview run={RESOLUTION_UNDER_REVIEW} />,
      },
      {
        id: 'manager-change-review',
        title: 'Reviewing the manager’s commits',
        render: () => <AddedReview run={MANAGER_CHANGE_UNDER_REVIEW} />,
      },
    ],
  },
]
