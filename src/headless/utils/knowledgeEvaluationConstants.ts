import type {
  KnowledgeEvaluationBuildMode,
  KnowledgeEvaluationCli,
  KnowledgeEvaluationPromptMode,
  KnowledgeEvaluationStage,
} from './knowledgeEvaluationTypes'

/** Every stage, in the order they go further. */
export const KNOWLEDGE_EVALUATION_STAGES: readonly KnowledgeEvaluationStage[] = [
  'smoke',
  'sample',
  'full',
  'deepen',
  'saturate',
  'drill',
]

/** Every steering, by its name. */
export const KNOWLEDGE_EVALUATION_PROMPT_MODES: readonly KnowledgeEvaluationPromptMode[] = [
  'neutral',
  'production',
]

/** Every way a map is built, by its name. */
export const KNOWLEDGE_EVALUATION_BUILD_MODES: readonly KnowledgeEvaluationBuildMode[] = [
  'heuristic',
  'llm',
]

/** Every CLI an evaluation may run its agents on. */
export const KNOWLEDGE_EVALUATION_CLIS: readonly KnowledgeEvaluationCli[] = [
  'claude-code',
  'cursor-agent',
  'codex',
]

/** A stage as people read it. */
export const KNOWLEDGE_EVALUATION_STAGE_LABEL: Record<KnowledgeEvaluationStage, string> = {
  smoke: 'Smoke',
  sample: 'Sample',
  full: 'Full',
  deepen: 'Deepen',
  saturate: 'Saturate',
  drill: 'Drill',
}

/** A steering as people read it. */
export const KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL: Record<KnowledgeEvaluationPromptMode, string> =
  {
    neutral: 'Neutral',
    production: 'Production',
  }

/** A way of building maps as people read it. */
export const KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL: Record<KnowledgeEvaluationBuildMode, string> = {
  heuristic: 'Heuristic',
  llm: 'LLM',
}

/** The short label of each launch setting, shared by the project editor and the approval card. */
export const KNOWLEDGE_EVALUATION_SETTING_LABEL = {
  stage: 'Stage',
  preset: 'Preset',
  model: 'Model',
  focusCapabilities: 'Focus',
  focusFixtures: 'Fixtures',
  focusExcludeCapabilities: 'Left out',
  llmFixtures: 'LLM fixtures',
  omitTools: 'Tools left out',
  promptMode: 'Steering',
  buildMode: 'Map build',
  concurrency: 'Concurrency',
  ablateRawSource: 'Raw source',
  comparePromptGenerations: 'Prompt generations',
  codeRef: 'Code',
  reset: 'Ledger',
} as const

/** What a model left unset falls back to. */
export const KNOWLEDGE_EVALUATION_HOST_MODEL = 'The host’s agent model'

/** A count of capabilities. */
export const KNOWLEDGE_EVALUATION_CAPABILITIES = (n: number): string =>
  `${n} ${n === 1 ? 'capability' : 'capabilities'}`

/** A count of fixtures. */
export const KNOWLEDGE_EVALUATION_FIXTURES = (n: number): string =>
  `${n} ${n === 1 ? 'fixture' : 'fixtures'}`
