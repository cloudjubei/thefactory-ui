import type { ReactNode } from 'react'
import { LAUNCH_HOW_IT_RUNS_HEADING, featureWorkAskView } from 'thefactory-ui/headless'
import { ModelChip } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import type { ModelInfo } from '../../src/headless/api'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import { launchRunnerLabel } from '../../src/headless/utils/approvalGrant'

const noop = () => {}

const CLI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', cli: 'claude-code' },
]

const API_CONFIG = {
  id: 'cfg-1',
  name: 'Claude Opus',
  provider: 'anthropic',
  model: 'claude-opus-5-5',
}

function AgentLabel() {
  const label = launchRunnerLabel({ runner: 'cli' }, 'cli')
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-(--border-default) bg-(--surface-base) px-2.5 text-[12px] text-(--text-secondary)">
      {label.label}
      <span className="rounded-full border border-(--border-subtle) bg-(--surface-overlay) px-1.5 py-[1px] text-[9px] font-semibold tracking-wide">
        {label.pill}
      </span>
    </span>
  )
}

function Chip({ open = false }: { open?: boolean }) {
  return (
    <ModelChip
      editable
      model="claude-opus-5-5"
      activeConfig={API_CONFIG}
      recents={[]}
      configs={[]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      useCli
      onToggleUseCli={noop}
      enabledClis={['claude-code', 'codex']}
      activeCli="claude-code"
      onPickCli={noop}
      cliModels={CLI_MODELS}
      onPickCliModel={noop}
      {...(open ? { defaultOpen: true } : {})}
    />
  )
}

function LaunchCard({ agent }: { agent: ReactNode }) {
  const view = featureWorkAskView({
    storyTitle: 'Spend per run',
    joinsOpenRun: false,
    mode: 'process',
  })
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base) p-3">
      <ToolAskCard view={view} busy={false} onApprove={noop} onDeny={noop} onLater={noop}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {LAUNCH_HOW_IT_RUNS_HEADING}
          </span>
          <div className="flex flex-wrap items-center gap-2">{agent}</div>
        </div>
      </ToolAskCard>
    </div>
  )
}

export const LAUNCH_MODEL_CHIP_SCENES: Scene[] = [
  {
    id: 'start-work-card-model',
    title: 'Start work card — the run’s model',
    component: 'StartWorkDialog · ApprovalPanel (startFeatureWork) · ModelChip',
    group: 'Process',
    description:
      'The launch card a story’s or a feature’s Run opens, and a feature request’s start, carries the same model chip as a chat’s launch card: it shows the agent the run will use — the person’s own CLI and model — and picks another for this run alone.',
    states: [
      {
        id: 'agent-label',
        title: 'Agent label',
        description:
          'The look-alike base: the card with no chip, naming the agent only as a label — what Run showed before.',
        render: () => <LaunchCard agent={<AgentLabel />} />,
      },
      {
        id: 'model-chip',
        title: 'Model chip',
        description:
          'Paired with Agent label: the card from Run with the model chip, showing the CLI and model the run will use.',
        render: () => <LaunchCard agent={<Chip />} />,
      },
      {
        id: 'model-chip-open',
        title: 'Model chip — picking',
        description:
          'Paired with Model chip: the chip open, offering the API or a CLI and its models for this run.',
        render: () => <LaunchCard agent={<Chip open />} />,
      },
    ],
  },
]
