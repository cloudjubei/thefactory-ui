import type { ReactNode } from 'react'
import {
  PROJECT_OVERVIEW_MODEL_TEXT,
  modelEffortChoice,
  type ModelEffortTarget,
  type ProjectOverviewModelChipWiring,
  type ProjectOverviewModelConfig,
} from 'thefactory-ui/headless'
import type { ModelInfo } from '../../src/headless/api'
import { ProjectOverviewModelField } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}

const HOSTED: ProjectOverviewModelConfig = {
  id: 'cfg-sonnet',
  name: 'Claude',
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
}
const LOCAL: ProjectOverviewModelConfig = {
  id: 'cfg-lmstudio',
  name: 'LM Studio',
  provider: 'openai',
  model: 'qwen3-coder-30b',
}
const CHEAP: ProjectOverviewModelConfig = {
  id: 'cfg-mini',
  name: 'Cheap writer',
  provider: 'openai',
  model: 'gpt-5-mini',
}
const CONFIGS = [HOSTED, LOCAL, CHEAP]

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
]

const API_EFFORT: ModelEffortTarget = {
  runner: 'api',
  provider: HOSTED.provider,
  model: HOSTED.model,
}

function wiring(
  over: Partial<ProjectOverviewModelChipWiring> = {},
): ProjectOverviewModelChipWiring {
  return {
    loading: false,
    off: true,
    onPickOff: noop,
    configs: CONFIGS,
    activeConfig: null,
    onPickConfig: noop,
    useCli: false,
    onToggleUseCli: noop,
    enabledClis: ['claude-code', 'codex'],
    activeCli: null,
    onPickCli: noop,
    cliModels: [],
    cliModelId: undefined,
    onPickCliModel: noop,
    authWarning: { needsReauth: false },
    effort: { ...modelEffortChoice({ runner: 'api' }), onPick: noop },
    switchError: null,
    ...over,
  }
}

const OFF = wiring()
const ON_HOSTED = wiring({
  off: false,
  activeConfig: HOSTED,
  effort: { ...modelEffortChoice({ ...API_EFFORT, choice: 'high' }), onPick: noop },
})
const ON_LOCAL = wiring({ off: false, activeConfig: LOCAL })
const ON_CLI = wiring({
  off: false,
  useCli: true,
  activeCli: 'claude-code',
  cliModels: CLAUDE_MODELS,
  cliModelId: 'claude-sonnet-5-5',
  effort: {
    ...modelEffortChoice({
      runner: 'cli',
      modelId: 'claude-sonnet-5-5',
      models: CLAUDE_MODELS,
      cliLevels: [],
    }),
    onPick: noop,
  },
})

function field(chip: ProjectOverviewModelChipWiring, open = false): ReactNode {
  return (
    <div className={open ? 'min-h-[460px] w-full max-w-[520px] p-4' : 'w-full max-w-[520px] p-4'}>
      <ProjectOverviewModelField
        wiring={chip}
        onOpenSettings={noop}
        getPrice={async () => undefined}
        defaultOpen={open}
      />
    </div>
  )
}

function state(
  id: string,
  title: string,
  description: string,
  chip: ProjectOverviewModelChipWiring,
  open = false,
): SceneState {
  return {
    id,
    title,
    description,
    ...(open ? { overlay: true } : {}),
    render: () => field(chip, open),
  }
}

export const PROJECT_OVERVIEW_MODEL_SCENES: Scene[] = [
  {
    id: 'project-overview-model',
    title: 'Project overview model',
    component: 'ProjectOverviewModelField',
    group: 'Settings',
    description:
      "Settings → LLMs → Project overviews, under its own collapsible section header on web, desktop and mobile (mobile uses the native peer of the same name): the composer's model chip — labelled exactly as there — with Off beside API and CLI, and one line of help. Every model is offered alike: every stored API config, with a key or without (a local LM Studio config on its own server address is just another config), and every CLI switched on in Settings with its models and effort. Off is the default; a chosen config that was deleted, or a CLI switched off, shows as Off, which is how the backend reads it.",
    states: [
      state('off', 'Off', 'Nothing chosen: overviews stay without the model.', OFF),
      state(
        'off-open',
        'Off, picker open',
        'Off, API and CLI side by side; picking API or CLI chooses its first config or the active CLI at once.',
        OFF,
        true,
      ),
      state(
        'api-open',
        'An API config',
        'Every stored config listed alike — the keyless local one too, with no word about keys — the chosen one ticked, with its effort.',
        ON_HOSTED,
        true,
      ),
      state(
        'api-local',
        'A local config chosen',
        'A keyless local config shows like any other: its provider and model.',
        ON_LOCAL,
      ),
      state(
        'cli-open',
        'A CLI chosen',
        "Every CLI switched on, the chosen one's models, and its effort — as in the composer.",
        ON_CLI,
        true,
      ),
      state(
        'loading',
        'Reading the setting',
        'Not editable until the stored choice is read, so it cannot be written over.',
        wiring({ loading: true }),
      ),
      state(
        'nothing-to-pick',
        'Nothing to pick yet',
        'No stored config and no CLI switched on: Off stays, and a tap on API or CLI says why under the switch.',
        wiring({
          configs: [],
          enabledClis: [],
          switchError: PROJECT_OVERVIEW_MODEL_TEXT.noConfigs,
        }),
        true,
      ),
    ],
  },
]
