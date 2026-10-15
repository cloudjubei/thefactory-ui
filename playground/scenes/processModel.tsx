import type { ReactNode } from 'react'
import type { ProcessRun, ProcessRunModel, ProcessRunTotals } from 'thefactory-tools/types'
import { ChatHeader, ModelChip } from 'thefactory-ui/web'
import {
  chatHeaderView,
  processRunChatContext,
  processRunModelChipView,
  RUN_CHAT_TITLE,
} from 'thefactory-ui/headless'
import type { ModelInfo } from '../../src/headless/api'
// Not on the package's public surface: the pipeline draws its head itself. The showcase reaches
// into the source for it, as the playground renders the library from source.
import { RunHead } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}
const NOW = 1_760_000_000_000

const OPUS: ProcessRunModel = { runner: 'cli', cli: 'claude-code', model: 'claude-opus-5-5' }
const SONNET: ProcessRunModel = { runner: 'cli', cli: 'claude-code', model: 'claude-sonnet-5-5' }

const CLI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', cli: 'claude-code' },
  { id: 'claude-haiku-5', label: 'Haiku 5', cli: 'claude-code' },
]

const API_CONFIG = {
  id: 'cfg-1',
  name: 'Claude Opus',
  provider: 'anthropic',
  model: 'claude-opus-5-5',
}

function totals(workingModels: ProcessRunModel[]): ProcessRunTotals {
  return {
    workMs: 0,
    time: {
      thinkingMs: 0,
      toolMs: 0,
      systemMs: 0,
      otherMs: 0,
      runningMs: 0,
      waitingMs: 0,
      tools: [],
    },
    ticking: false,
    ...(workingModels.length > 0 ? { workingModels } : {}),
    at: NOW,
    steps: {},
  }
}

const BASE_RUN: ProcessRun = {
  id: 'run-story',
  projectId: 'p1',
  title: 'Let unit tests watch their files',
  status: 'running',
  input: { runner: 'cli', cliRunner: { cli: 'claude-code', model: 'claude-opus-5-5' } },
  loopCounts: {},
  ledger: [
    {
      id: 'plan-1',
      stepId: 'plan',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
      model: OPUS,
    },
    {
      id: 'impl-1',
      stepId: 'implement',
      iteration: 1,
      status: 'running',
      startedAt: 0,
      model: OPUS,
    },
  ],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'plan', name: 'Plan', kind: 'agent', agentType: 'planner' },
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
}

/** A step agent at work on Opus 5.5, nothing changed. */
const RUNNING: ProcessRun = { ...BASE_RUN, totals: totals([OPUS]) }

/** Switched to Sonnet 5.5 while the agent at work runs on Opus 5.5. */
const PENDING: ProcessRun = {
  ...BASE_RUN,
  modelOverride: { ...SONNET, runner: 'cli', at: 1 },
  totals: totals([OPUS]),
}

/** Waiting on the person after a failed step: a change applies now. */
const PARKED: ProcessRun = {
  ...BASE_RUN,
  status: 'parked',
  park: { reason: 'step-failed', stepId: 'implement', message: 'Implement failed.', parkedAt: 0 },
  modelOverride: { ...SONNET, runner: 'cli', at: 1 },
  ledger: [BASE_RUN.ledger[0], { ...BASE_RUN.ledger[1], status: 'done', outcome: 'failed' }],
  totals: totals([]),
}

/** Signed off and merged: what ran is a fact. */
const ENDED: ProcessRun = {
  ...BASE_RUN,
  status: 'succeeded',
  ledger: [BASE_RUN.ledger[0], { ...BASE_RUN.ledger[1], status: 'done', outcome: 'passed' }],
  totals: totals([]),
}

type ChipProps = { model: ProcessRunModel; note?: string; open?: boolean; mode?: 'chat' }

/** The chat chip as the host renders it: the API/CLI toggle, the CLI and its models. */
function Chip({ model, note, open = false, mode }: ChipProps) {
  const cli = model.runner === 'cli'
  return (
    <ModelChip
      editable
      mode={mode ?? 'agentRun'}
      {...(cli && model.model ? { model: model.model } : {})}
      activeConfig={API_CONFIG}
      recents={[API_CONFIG]}
      configs={[API_CONFIG]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      useCli={cli}
      onToggleUseCli={noop}
      enabledClis={['claude-code', 'codex']}
      activeCli={cli ? (model.cli ?? null) : null}
      onPickCli={noop}
      cliModels={CLI_MODELS}
      onPickCliModel={noop}
      {...(note ? { note } : {})}
      {...(open ? { defaultOpen: true } : {})}
    />
  )
}

/** The run's header as the pipeline draws it, its model chip the host's chooser while it is live. */
function Head({ run, open = false }: { run: ProcessRun; open?: boolean }) {
  const view = processRunModelChipView(run)
  const current = run.modelOverride ?? OPUS
  return (
    <RunHead
      run={run}
      stopHolder={undefined}
      depth={0}
      now={NOW}
      projectName="TheFactory Tools"
      onCrumb={noop}
      onCancel={noop}
      onDelete={noop}
      model={{
        view,
        ...(view.editable ? { chip: <Chip model={current} note={view.note} open={open} /> } : {}),
      }}
      chat={{ onOpen: noop, unread: false }}
    />
  )
}

function headState(
  id: string,
  title: string,
  description: string,
  run: ProcessRun,
  open = false,
): SceneState {
  const frame = (
    <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
      <Head run={run} open={open} />
    </div>
  )
  return {
    id,
    title,
    description,
    ...(open ? { overlay: true } : {}),
    render: (): ReactNode => (open ? <div className="min-h-[420px]">{frame}</div> : frame),
  }
}

/**
 * The run chat's own header with the chat's model chip — not the run's. Docked beside its run it
 * is one slim row (collapse · "Run chat" · the chip · open in Chat); maximized on the Chat screen
 * it is the full header.
 */
function RunChatHeader({
  model,
  open = false,
  maximized = false,
}: {
  model: ProcessRunModel
  open?: boolean
  maximized?: boolean
}) {
  const view = chatHeaderView({
    context: processRunChatContext(BASE_RUN),
    chatTitle: `Run: ${BASE_RUN.title}`,
    projectName: 'TheFactory Tools',
    run: BASE_RUN,
    now: NOW,
  })
  return (
    <div
      className={`${maximized ? 'max-w-[760px]' : 'max-w-[460px]'} overflow-hidden rounded-lg border border-(--border-subtle)`}
    >
      <ChatHeader
        view={view}
        {...(maximized ? {} : { narrow: true, dockedLabel: RUN_CHAT_TITLE })}
        modelChip={<Chip model={model} mode="chat" open={open} />}
        onCollapse={noop}
        onMaximize={noop}
      />
    </div>
  )
}

export const PROCESS_MODEL_SCENES: Scene[] = [
  {
    id: 'run-model-chip',
    title: 'Run model chip',
    component: 'RunModelControl · ModelChip (RunHead)',
    group: 'Process',
    description:
      'The model the run’s step agents run on, in the run’s header. While the run is live it is the chat chip as a chooser for the run — the API or a CLI, its model and login — and a pick is the run’s model from the next step: the agent at work is never switched mid-step. A run waiting on the person takes the change at once. An ended run shows what ran, read-only.',
    states: [
      headState(
        'idle-editable',
        'Live, nothing waiting',
        'A step agent at work on Opus 5.5, the run’s model. The chip is editable.',
        RUNNING,
      ),
      headState(
        'pending-next-step',
        'Change waiting for the step at work',
        'Switched to Sonnet 5.5 while the agent at work runs on Opus 5.5: it finishes its step on Opus 5.5, and the next step runs on Sonnet 5.5.',
        PENDING,
      ),
      headState(
        'parked-applies-now',
        'Waiting on the person — applies now',
        'The run stopped on a failed step, so no agent is at work: the change to Sonnet 5.5 applies now, and the step that is tried again runs on it.',
        PARKED,
      ),
      headState(
        'ended-read-only',
        'Ended — read-only',
        'A signed-off run: the chip names what ran and cannot be changed.',
        ENDED,
      ),
      headState(
        'picker-next-step',
        'Picker while a step runs',
        'The chip’s picker says plainly that a pick takes effect when the current step finishes.',
        PENDING,
        true,
      ),
      headState(
        'picker-applies-now',
        'Picker while the run waits',
        'The chip’s picker says the run is waiting, so a pick applies now.',
        PARKED,
        true,
      ),
    ],
  },
  {
    id: 'run-chat-model-chip',
    title: 'Run chat model chip',
    component: 'ChatHeader (run chat) · ModelChip',
    group: 'Process',
    description:
      'The run chat’s header carries the editable model chip every chat has — in the slim row it has docked beside its run, and in its full header when maximized on the Chat screen. It changes what the chat runs on for its next turns — never the run’s step agents, which the run header’s chip changes.',
    states: [
      {
        id: 'cli',
        title: 'Docked, on a CLI',
        description:
          'The run chat docked beside its run: one slim row — collapse, “Run chat”, the chat’s model chip (Claude Code with Sonnet 5.5) and open in Chat.',
        render: () => <RunChatHeader model={SONNET} />,
      },
      {
        id: 'api',
        title: 'Docked, on the API',
        description: 'The same slim row with the run chat on an API model.',
        render: () => <RunChatHeader model={{ runner: 'api' }} />,
      },
      {
        id: 'picker-open',
        title: 'Docked, picker open',
        description:
          'The chat chip’s picker from the slim row: the API/CLI toggle, the CLI and its models.',
        overlay: true,
        render: () => (
          <div className="min-h-[420px]">
            <RunChatHeader model={SONNET} open />
          </div>
        ),
      },
      {
        id: 'maximized',
        title: 'Maximized on the Chat screen',
        description:
          'Opened on the Chat screen, the run chat gets its full header back — the same editable chip beside its title.',
        render: () => <RunChatHeader model={SONNET} maximized />,
      },
    ],
  },
]
