import type { ModelInfo, RedactedLlmConfigEntry } from '../../headless/api/generated/types.gen'
import { FAKE_STAMP } from './stamps'

export const CLI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', cli: 'claude-code' },
]

export const API_CONFIG = {
  id: 'cfg-1',
  name: 'Claude Opus',
  provider: 'anthropic',
  model: 'claude-opus-5-5',
} satisfies Pick<RedactedLlmConfigEntry, 'id' | 'name' | 'provider' | 'model'>

export const FAKE_LLM_CONFIGS: RedactedLlmConfigEntry[] = [
  { ...API_CONFIG, ...FAKE_STAMP, hasApiKey: true },
  {
    id: 'cfg-local',
    name: 'Local model',
    provider: 'custom',
    model: 'local-model',
    apiUrlOverride: 'http://127.0.0.1:11434/v1',
    billing: 'free',
    ...FAKE_STAMP,
    hasApiKey: false,
  },
]
