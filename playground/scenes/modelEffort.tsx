import type { ReactNode } from 'react'
import { ModelChip } from 'thefactory-ui/web'
import { modelEffortChoice, type ModelEffortTarget } from 'thefactory-ui/headless'
import type { ModelInfo } from '../../src/headless/api'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}

const CLAUDE_MODELS: ModelInfo[] = [
  {
    id: 'claude-opus-5-5',
    label: 'Opus 5.5',
    cli: 'claude-code',
    effortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Sonnet 5.5',
    cli: 'claude-code',
    effortLevels: ['low', 'medium', 'high', 'max'],
  },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', cli: 'claude-code' },
]

const GPT_CONFIG = { id: 'cfg-gpt', name: 'GPT-5.5', provider: 'openai', model: 'gpt-5.5' }
const LADDER = ['low', 'medium', 'high', 'xhigh', 'max']

type ChipCase = { cli?: { modelId: string }; target: ModelEffortTarget }

/** The chat chip, its picker open, with the effort switch for the model it is on. */
function Chip({ cli, target }: ChipCase) {
  return (
    <ModelChip
      editable
      defaultOpen
      mode="chat"
      {...(cli ? { model: cli.modelId } : {})}
      activeConfig={GPT_CONFIG}
      recents={[GPT_CONFIG]}
      configs={[GPT_CONFIG]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      useCli={!!cli}
      onToggleUseCli={noop}
      enabledClis={['claude-code', 'codex']}
      activeCli={cli ? 'claude-code' : null}
      onPickCli={noop}
      cliModels={CLAUDE_MODELS}
      onPickCliModel={noop}
      effort={{ ...modelEffortChoice(target), onPick: noop }}
    />
  )
}

function chipState(id: string, title: string, description: string, chip: ChipCase): SceneState {
  return {
    id,
    title,
    description,
    overlay: true,
    render: (): ReactNode => (
      <div className="min-h-[460px] p-4">
        <Chip {...chip} />
      </div>
    ),
  }
}

export const MODEL_EFFORT_SCENES: Scene[] = [
  {
    id: 'model-effort-switch',
    title: 'Effort switch',
    component: 'ModelChip (effort)',
    group: 'Chat',
    description:
      'The reasoning effort of the model the chip is on, in its picker, the same for a CLI model and an API model. It offers only the levels that model takes, and “Default” — naming the default set in Settings — leaves it to that default. A model with no effort shows no switch.',
    states: [
      chipState(
        'cli-full-ladder',
        'Opus: the full ladder',
        'A CLI chat on Opus 5.5, set to High; its default in Settings is X-high.',
        {
          cli: { modelId: 'claude-opus-5-5' },
          target: {
            runner: 'cli',
            modelId: 'claude-opus-5-5',
            models: CLAUDE_MODELS,
            cliLevels: LADDER,
            choice: 'high',
            modelDefault: 'xhigh',
            cliDefault: 'medium',
          },
        },
      ),
      chipState(
        'cli-no-effort',
        'Haiku: no effort',
        'Haiku 5.5 takes no effort, so the picker shows no switch — though the CLI has a default.',
        {
          cli: { modelId: 'claude-haiku-5-5' },
          target: {
            runner: 'cli',
            modelId: 'claude-haiku-5-5',
            models: CLAUDE_MODELS,
            cliLevels: LADDER,
            choice: 'high',
            cliDefault: 'medium',
          },
        },
      ),
      chipState(
        'api-model',
        'API model',
        'An API chat on GPT-5.5: its four levels, left on the config’s default of X-high.',
        {
          target: {
            runner: 'api',
            provider: 'openai',
            model: 'gpt-5.5',
            configDefault: 'xhigh',
          },
        },
      ),
    ],
  },
]
