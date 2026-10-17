import type { ReactNode } from 'react'
import { ToolCallCard, type ToolCallCardProps } from 'thefactory-ui/web'
import { type PendingToolGrant } from 'thefactory-ui/headless'
// Not on the package's public surface: the chat renders them itself. The showcase reaches into
// the source for them, as the playground renders the library from source anyway.
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import {
  OpenQuestionsBox,
  type OpenQuestionAnswerInputProps,
} from '../../src/web/compound/chat/OpenQuestionsCard'
import { Textarea } from '../../src/web/primitives/Textarea'
import type { OpenQuestionsCardView } from '../../src/headless/utils/openQuestionsCardTypes'
import { OPEN_QUESTIONS_COPY } from '../../src/headless/utils/openQuestionsCardConstants'
import type { Scene } from '../showcase/types'

const noop = () => {}
const BRANCH = 'agent/ae7de0c465e9'
const FILES = [
  'scripts/ToolSchemaGenerator.ts',
  'src/completion/providers/completionProviderGemini.ts',
  'src/mcpServer/mcpServerHelpers.test.ts',
  'src/projectChecks/ProjectCheckTools.test.ts',
  'src/projectChecks/projectChecksTypes.ts',
  'src/tools/generated/ToolSchemas.ts',
  'src/completion/providers/projectCheckProviderSchemas.test.ts',
  'src/tools/ToolSchemaGenerator.test.ts',
]

// ---------------------------------------------------------------------------------------------
// A decision on the chat's open changes, asked on the dock's card

/** Sized like the dock it replaces the composer in. */
function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base)">
      {children}
    </div>
  )
}

const HEADLINES: Record<string, string> = {
  merge: `Merge ${BRANCH} into main`,
  'pull-request': `Open a pull request from ${BRANCH} into main`,
  'leave-branch': `Approve and keep ${BRANCH}`,
  'request-changes': `Ask for changes on ${BRANCH}`,
  reject: `Discard ${BRANCH}`,
}

/** The ask as the host raises it: the card it read before asking, and no standing grant. */
function decision(choice: string, reason: string): PendingToolGrant {
  const toTarget = choice === 'merge' || choice === 'pull-request'
  const card = {
    decision: choice,
    headline: HEADLINES[choice],
    runId: '9ab3dee0',
    branch: BRANCH,
    ...(toTarget ? { target: 'main' } : {}),
    fileCount: FILES.length,
    files: FILES,
  }
  return {
    id: `grant-review-${choice}`,
    chatRunner: 'api',
    label: 'decideChatOpenChanges',
    toolName: 'decideChatOpenChanges',
    args: { decision: choice, reason },
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    detail: { tool: 'decideChatOpenChanges', args: { decision: choice, reason }, detail: card },
    decide: () => new Promise<void>(noop),
  }
}

function DecisionDock({ choice, reason }: { choice: string; reason: string }) {
  return (
    <Dock>
      <ApprovalPanel grant={decision(choice, reason)} onDecideLater={noop} />
    </Dock>
  )
}

/** A merge approved after a later turn added commits: nothing was merged, and the row says so. */
const MOVED: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-review-moved',
    name: 'decideChatOpenChanges',
    arguments: { decision: 'merge', reason: 'The person asked to get this merged in.' },
  },
  resultType: 'errored',
  result: { error: 'The changes moved since you were asked — ask again.' },
  durationMs: 41,
}

/** A merge the review's gates refused before anyone was asked: the row says why. */
const REFUSED: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-review-refused',
    name: 'decideChatOpenChanges',
    arguments: { decision: 'merge', reason: 'The person asked to get this merged in.' },
  },
  resultType: 'errored',
  result: {
    error:
      '1 of 2 features is not finished yet: “Normalize no-variant inputs and return actionable pre-execution refusals” (pending).',
  },
  durationMs: 64,
}

// ---------------------------------------------------------------------------------------------
// An agent's answer to a feature's question, asked on the dock's card

const QUESTION_CARD = {
  headline: 'Answer a question on “Normalize no-variant inputs”',
  projectId: 'thefactory-tools',
  storyId: 's1',
  storyTitle: 'Project checks on every runner',
  featureId: 'f1',
  featureTitle: 'Normalize no-variant inputs',
  questionId: 'q1',
  question: 'The sibling thefactory-db types are not in this workspace. Build against them?',
  askedAt: '2026-10-14T21:48:44.000Z',
}

/** The ask as the host raises it: the question it read off the story, and the agent's answer. */
function answerGrant(answer: string): PendingToolGrant {
  const args = { storyId: 's1', questionId: 'q1', answer }
  return {
    id: `grant-answer-${answer.length}`,
    chatRunner: 'api',
    label: 'submitFeatureQuestionAnswer',
    toolName: 'submitFeatureQuestionAnswer',
    args,
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    detail: {
      tool: 'submitFeatureQuestionAnswer',
      args,
      detail: { ...QUESTION_CARD, answer },
    },
    decide: () => new Promise<void>(noop),
  }
}

function AnswerDock({ answer }: { answer: string }) {
  return (
    <Dock>
      <ApprovalPanel grant={answerGrant(answer)} onDecideLater={noop} />
    </Dock>
  )
}

/** Answered on the story while the card waited: nothing was sent. */
const ANSWERED_MEANWHILE: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-answer-meanwhile',
    name: 'submitFeatureQuestionAnswer',
    arguments: { storyId: 's1', questionId: 'q1', answer: 'Yes — build against the sibling.' },
  },
  resultType: 'errored',
  result: { error: 'That question is answered already: “No, stub them.”. Nothing was sent.' },
  durationMs: 52,
}

/** Approved: saved as the person's answer, and the paused work carried on. */
const ANSWER_SENT: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-answer-sent',
    name: 'submitFeatureQuestionAnswer',
    arguments: { storyId: 's1', questionId: 'q1', answer: 'Yes — build against the sibling.' },
  },
  resultType: 'succeeded',
  result: { answered: true, storyId: 's1', featureId: 'f1', questionId: 'q1', carriedOn: true },
  durationMs: 310,
}

// ---------------------------------------------------------------------------------------------
// The questions a paused run waits on, in its chat

const QUESTIONS: OpenQuestionsCardView = {
  state: 'open',
  title: OPEN_QUESTIONS_COPY.title(2),
  questions: [
    {
      featureId: 'f1',
      featureTitle: 'Normalize no-variant inputs',
      questionId: 'q1',
      question: 'The sibling thefactory-db types are not in this workspace. Build against them?',
      askedAt: '2026-10-14T21:48:44.000Z',
    },
    {
      featureId: 'f2',
      featureTitle: 'Project checks on the CLI',
      questionId: 'q2',
      question: 'Should a project without variants run every check, or only the default?',
      askedAt: '2026-10-14T21:49:02.000Z',
    },
  ],
}

/** The chat's reference box reads the project's files; the showcase has none, so a plain box. */
function PlainAnswerInput({ value, placeholder }: OpenQuestionAnswerInputProps) {
  return (
    <Textarea
      rows={1}
      readOnly
      value={value}
      placeholder={placeholder}
      className="py-1 text-[12px]"
    />
  )
}

function Questions({
  view,
  answers = {},
  answering,
  failed,
}: {
  view: OpenQuestionsCardView
  answers?: Record<string, string>
  answering?: string
  failed?: string
}) {
  return (
    <div className="max-w-2xl">
      <OpenQuestionsBox
        view={view}
        at="Today 21:49"
        answers={answers}
        setAnswer={noop}
        answering={answering}
        failed={failed}
        submit={async () => {}}
        AnswerInput={PlainAnswerInput}
      />
    </div>
  )
}

export const CHAT_PAUSED_RUN_SCENES: Scene[] = [
  {
    id: 'chat-review-decision',
    title: 'Deciding a chat’s changes',
    component: 'ApprovalPanel',
    group: 'Chat',
    description:
      'An agent asks to decide the chat’s open changes as the review panel does. The card is what the host read before asking: the branch, where it goes, how many files. Always asked; no “Always allow”.',
    states: [
      {
        id: 'merge',
        title: 'Merge',
        render: () => (
          <DecisionDock choice="merge" reason="The person asked to get this merged in." />
        ),
      },
      {
        id: 'pull-request',
        title: 'Pull request',
        render: () => <DecisionDock choice="pull-request" reason="The team reviews on GitHub." />,
      },
      {
        id: 'leave-branch',
        title: 'Approve, keep the branch',
        render: () => (
          <DecisionDock choice="leave-branch" reason="Merge it later with the release." />
        ),
      },
      {
        id: 'request-changes',
        title: 'Ask for changes',
        render: () => <DecisionDock choice="request-changes" reason="Rename the helper first." />,
      },
      {
        id: 'reject',
        title: 'Discard',
        render: () => <DecisionDock choice="reject" reason="The approach was wrong." />,
      },
      {
        id: 'refused',
        title: 'Refused, with why',
        description: 'The story is not finished, so the merge is refused before anyone is asked.',
        render: () => (
          <div className="max-w-2xl">
            <ToolCallCard {...REFUSED} />
          </div>
        ),
      },
      {
        id: 'moved',
        title: 'Moved since asked',
        description:
          'A later turn added commits after the card was raised. On approval the card’s fingerprint — the branch’s head, its files, where they go — no longer matches, so nothing is merged.',
        render: () => (
          <div className="max-w-2xl">
            <ToolCallCard {...MOVED} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'feature-question-answer',
    title: 'Answering a feature’s question',
    component: 'ApprovalPanel',
    group: 'Chat',
    description:
      'An agent answers a question a run raised on a feature. The card shows the question as the host read it off the story and the agent’s answer, which the person may change. Always asked; no “Always allow”. The run’s manager may only prepare it.',
    states: [
      {
        id: 'proposed',
        title: 'Answer proposed',
        render: () => <AnswerDock answer="Yes — build against the sibling." />,
      },
      {
        id: 'empty',
        title: 'No answer yet',
        description: 'Send waits until the answer has words.',
        render: () => <AnswerDock answer="" />,
      },
      {
        id: 'answered-meanwhile',
        title: 'Answered elsewhere',
        description: 'Answered on the story while the card waited: nothing was sent.',
        render: () => (
          <div className="max-w-2xl">
            <ToolCallCard {...ANSWERED_MEANWHILE} />
          </div>
        ),
      },
      {
        id: 'sent',
        title: 'Sent',
        description: 'Saved as the person’s answer; the paused work carried on.',
        render: () => (
          <div className="max-w-2xl">
            <ToolCallCard {...ANSWER_SENT} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'paused-run-questions',
    title: 'Questions a paused run waits on',
    component: 'OpenQuestionsCard',
    group: 'Chat',
    description:
      'Posted when a person’s reply in a paused run’s chat cannot be matched to one question. Read live from the story, each question with its answer box; answering carries the work on.',
    states: [
      { id: 'open', title: 'Two open', render: () => <Questions view={QUESTIONS} /> },
      {
        id: 'typing',
        title: 'An answer typed',
        render: () => (
          <Questions view={QUESTIONS} answers={{ q1: 'Yes — build against the sibling.' }} />
        ),
      },
      {
        id: 'sending',
        title: 'Sending',
        render: () => (
          <Questions
            view={QUESTIONS}
            answers={{ q1: 'Yes — build against the sibling.' }}
            answering="q1"
          />
        ),
      },
      {
        id: 'not-saved',
        title: 'Not saved',
        render: () => (
          <Questions
            view={QUESTIONS}
            answers={{ q1: 'Yes — build against the sibling.' }}
            failed="q1"
          />
        ),
      },
      {
        id: 'answered',
        title: 'All answered',
        render: () => (
          <Questions
            view={{ state: 'answered', title: OPEN_QUESTIONS_COPY.answered, questions: [] }}
          />
        ),
      },
    ],
  },
]
