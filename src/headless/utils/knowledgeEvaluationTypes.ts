import type { GetKnowledgeEvaluationSettingsResponse } from '../api/generated'

/** How far a knowledge evaluation goes. */
export type KnowledgeEvaluationStage =
  GetKnowledgeEvaluationSettingsResponse['choices']['stages'][number]

/** The both-tools steering an evaluation runs under. */
export type KnowledgeEvaluationPromptMode =
  GetKnowledgeEvaluationSettingsResponse['choices']['promptModes'][number]

/** How the maps an evaluation grades are built. */
export type KnowledgeEvaluationBuildMode =
  GetKnowledgeEvaluationSettingsResponse['choices']['buildModes'][number]

/** A CLI an evaluation may run its agents on. */
export type KnowledgeEvaluationCli =
  GetKnowledgeEvaluationSettingsResponse['choices']['clis'][number]

/**
 * A project's own evaluation launch settings, kept in `metadata.evaluationDefaults`: what a launch
 * that leaves a setting out runs with, before the Evaluation tab's defaults. The model is a CLI
 * (with an optional model id) or an API config — never both.
 */
export type KnowledgeEvaluationDefaults = {
  stage?: KnowledgeEvaluationStage
  preset?: string
  focusCapabilities?: string[]
  focusFixtures?: string[]
  promptMode?: KnowledgeEvaluationPromptMode
  buildMode?: KnowledgeEvaluationBuildMode
  concurrency?: number
  cli?: KnowledgeEvaluationCli
  modelId?: string
  llmConfigId?: string
}

/** What the project editor needs to edit the defaults: whether they apply, the tab's defaults and every choice. */
export type KnowledgeEvaluationSettings = Omit<
  GetKnowledgeEvaluationSettingsResponse,
  'defaults'
> & {
  defaults: KnowledgeEvaluationDefaults | null
}
