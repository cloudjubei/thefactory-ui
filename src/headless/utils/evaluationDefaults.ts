/** A project's evaluation defaults: read from its metadata, edited in the project editor, written back. Pure. */

import {
  EVALUATION_DEFAULTS_COPY,
  EVALUATION_DEFAULTS_METADATA_KEY,
  EVALUATION_DEFAULT_NONE,
} from './evaluationDefaultsConstants'
import type {
  EvaluationChoiceKey,
  EvaluationChoiceOption,
  EvaluationDefaultsFieldView,
  EvaluationFocusKey,
  EvaluationFocusOption,
  EvaluationModelKind,
} from './evaluationDefaultsTypes'
import {
  KNOWLEDGE_EVALUATION_BUILD_MODES,
  KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL,
  KNOWLEDGE_EVALUATION_CAPABILITIES,
  KNOWLEDGE_EVALUATION_CLIS,
  KNOWLEDGE_EVALUATION_FIXTURES,
  KNOWLEDGE_EVALUATION_HOST_MODEL,
  KNOWLEDGE_EVALUATION_PROMPT_MODES,
  KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL,
  KNOWLEDGE_EVALUATION_SETTING_LABEL,
  KNOWLEDGE_EVALUATION_STAGES,
  KNOWLEDGE_EVALUATION_STAGE_LABEL,
} from './knowledgeEvaluationConstants'
import type {
  KnowledgeEvaluationDefaults,
  KnowledgeEvaluationSettings,
} from './knowledgeEvaluationTypes'

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

const names = (v: unknown): string[] =>
  Array.isArray(v)
    ? [
        ...new Set(
          v
            .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
            .map((s) => s.trim()),
        ),
      ]
    : []

const oneOf = <T extends string>(choices: readonly T[], v: unknown): T | undefined =>
  typeof v === 'string' && (choices as readonly string[]).includes(v) ? (v as T) : undefined

/**
 * The defaults a value holds, keeping only settings of the right shape; none when it holds none.
 * A CLI wins over an API config, and a model id is kept only beside a CLI. Pure.
 */
export function readEvaluationDefaults(raw: unknown): KnowledgeEvaluationDefaults | undefined {
  const r = record(raw)
  const stage = oneOf(KNOWLEDGE_EVALUATION_STAGES, r.stage)
  const preset = text(r.preset)
  const focusCapabilities = names(r.focusCapabilities)
  const focusFixtures = names(r.focusFixtures)
  const promptMode = oneOf(KNOWLEDGE_EVALUATION_PROMPT_MODES, r.promptMode)
  const buildMode = oneOf(KNOWLEDGE_EVALUATION_BUILD_MODES, r.buildMode)
  const concurrency =
    typeof r.concurrency === 'number' && Number.isInteger(r.concurrency) && r.concurrency >= 1
      ? r.concurrency
      : undefined
  const cli = oneOf(KNOWLEDGE_EVALUATION_CLIS, r.cli)
  const modelId = cli ? text(r.modelId) : undefined
  const llmConfigId = cli ? undefined : text(r.llmConfigId)
  const defaults: KnowledgeEvaluationDefaults = {
    ...(stage ? { stage } : {}),
    ...(preset ? { preset } : {}),
    ...(focusCapabilities.length > 0 ? { focusCapabilities } : {}),
    ...(focusFixtures.length > 0 ? { focusFixtures } : {}),
    ...(promptMode ? { promptMode } : {}),
    ...(buildMode ? { buildMode } : {}),
    ...(concurrency !== undefined ? { concurrency } : {}),
    ...(cli ? { cli } : {}),
    ...(modelId ? { modelId } : {}),
    ...(llmConfigId ? { llmConfigId } : {}),
  }
  return Object.keys(defaults).length > 0 ? defaults : undefined
}

/** The project's metadata with these defaults kept under their key — or the key gone when none is set. Pure. */
export function withEvaluationDefaults<T extends Record<string, unknown>>(
  metadata: T,
  defaults: KnowledgeEvaluationDefaults | undefined,
): T {
  const { [EVALUATION_DEFAULTS_METADATA_KEY]: _was, ...rest } = metadata
  const kept = readEvaluationDefaults(defaults)
  return (kept ? { ...rest, [EVALUATION_DEFAULTS_METADATA_KEY]: kept } : rest) as T
}

/** The model the defaults name, as one label; none when they name none. Pure. */
export function evaluationDefaultsModelLabel(
  defaults: KnowledgeEvaluationDefaults | undefined,
): string | undefined {
  if (defaults?.cli) return defaults.modelId ? `${defaults.cli}/${defaults.modelId}` : defaults.cli
  return defaults?.llmConfigId
    ? `${EVALUATION_DEFAULTS_COPY.modelKinds.api} ${defaults.llmConfigId}`
    : undefined
}

/** The defaults in one short line, in the order a launch reads them. Pure. */
export function evaluationDefaultsSummary(
  defaults: KnowledgeEvaluationDefaults | undefined,
): string {
  if (!defaults) return EVALUATION_DEFAULTS_COPY.none
  const model = evaluationDefaultsModelLabel(defaults)
  const parts = [
    defaults.stage ? KNOWLEDGE_EVALUATION_STAGE_LABEL[defaults.stage] : undefined,
    defaults.preset,
    defaults.focusCapabilities
      ? KNOWLEDGE_EVALUATION_CAPABILITIES(defaults.focusCapabilities.length)
      : undefined,
    defaults.focusFixtures
      ? KNOWLEDGE_EVALUATION_FIXTURES(defaults.focusFixtures.length)
      : undefined,
    defaults.promptMode ? KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL[defaults.promptMode] : undefined,
    defaults.buildMode ? KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL[defaults.buildMode] : undefined,
    defaults.concurrency !== undefined ? `${defaults.concurrency} at once` : undefined,
    model,
  ].filter((p): p is string => p !== undefined)
  return parts.join(' · ')
}

/** The defaults with one choice set, or cleared when it is set to "not set". Pure. */
export function evaluationDefaultsWithChoice(
  defaults: KnowledgeEvaluationDefaults | undefined,
  key: EvaluationChoiceKey,
  value: string,
): KnowledgeEvaluationDefaults | undefined {
  const { [key]: _was, ...rest } = defaults ?? {}
  return readEvaluationDefaults(
    value === EVALUATION_DEFAULT_NONE ? rest : { ...rest, [key]: value },
  )
}

/** The defaults with one name of a focus list picked, or unpicked when it was. Pure. */
export function evaluationDefaultsWithFocus(
  defaults: KnowledgeEvaluationDefaults | undefined,
  key: EvaluationFocusKey,
  value: string,
): KnowledgeEvaluationDefaults | undefined {
  const current = defaults?.[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  return readEvaluationDefaults({ ...defaults, [key]: next })
}

/** The defaults with the concurrency typed: a whole number of at least one, or cleared. Pure. */
export function evaluationDefaultsWithConcurrency(
  defaults: KnowledgeEvaluationDefaults | undefined,
  typed: string,
): KnowledgeEvaluationDefaults | undefined {
  const { concurrency: _was, ...rest } = defaults ?? {}
  const trimmed = typed.trim()
  return readEvaluationDefaults(
    /^\d+$/.test(trimmed) ? { ...rest, concurrency: Number(trimmed) } : rest,
  )
}

/** The defaults with their model set: none, a CLI with its optional model id, or an API config. Pure. */
export function evaluationDefaultsWithModel(
  defaults: KnowledgeEvaluationDefaults | undefined,
  model:
    | { kind: 'host' }
    | { kind: 'cli'; cli?: string; modelId?: string }
    | { kind: 'api'; llmConfigId?: string },
): KnowledgeEvaluationDefaults | undefined {
  const { cli: _cli, modelId: _modelId, llmConfigId: _llm, ...rest } = defaults ?? {}
  if (model.kind === 'cli') return readEvaluationDefaults({ ...rest, ...model })
  if (model.kind === 'api')
    return readEvaluationDefaults({ ...rest, llmConfigId: model.llmConfigId })
  return readEvaluationDefaults(rest)
}

/** Which kind of model the field shows: the one the defaults name, else the one last picked. Pure. */
export function evaluationModelKind(
  defaults: KnowledgeEvaluationDefaults | undefined,
  picked: EvaluationModelKind,
): EvaluationModelKind {
  if (defaults?.cli) return 'cli'
  if (defaults?.llmConfigId) return 'api'
  return picked
}

function focusOptions(
  known: Array<{ value: string; label: string; count?: string }>,
  picked: string[],
): EvaluationFocusOption[] {
  const unknown = picked.filter((p) => !known.some((k) => k.value === p))
  return [...known, ...unknown.map((value) => ({ value, label: value }))].map((o) => ({
    ...o,
    selected: picked.includes(o.value),
  }))
}

function withCurrent(options: EvaluationChoiceOption[], value: string | undefined) {
  return value && !options.some((o) => o.value === value)
    ? [...options, { value, label: value }]
    : options
}

/**
 * The evaluation defaults field as it draws: every choice with its "not set" option saying what
 * it falls back to — the Evaluation tab's default, or the host's agent model — the focus lists with
 * their scenario counts, and the model as one of none, a CLI, or an API config. Pure.
 */
export function evaluationDefaultsFieldView(
  defaults: KnowledgeEvaluationDefaults | undefined,
  settings: Pick<KnowledgeEvaluationSettings, 'tabDefaults' | 'choices'>,
  pickedModel: EvaluationModelKind,
): EvaluationDefaultsFieldView {
  const { tabDefaults, choices } = settings
  const copy = EVALUATION_DEFAULTS_COPY
  const L = KNOWLEDGE_EVALUATION_SETTING_LABEL
  const none = (label: string): EvaluationChoiceOption => ({
    value: EVALUATION_DEFAULT_NONE,
    label,
  })
  const max = choices.concurrencyMax
  const concurrency = defaults?.concurrency
  const kind = evaluationModelKind(defaults, pickedModel)
  const hasModel = Boolean(defaults?.cli || defaults?.llmConfigId)
  const picked = defaults?.focusCapabilities ?? []
  const pickedFixtures = defaults?.focusFixtures ?? []
  return {
    title: copy.title,
    hint: copy.hint,
    summary: evaluationDefaultsSummary(defaults),
    stage: {
      label: L.stage,
      value: defaults?.stage ?? EVALUATION_DEFAULT_NONE,
      options: [
        none(copy.stageNone),
        ...choices.stages.map((s) => ({ value: s, label: KNOWLEDGE_EVALUATION_STAGE_LABEL[s] })),
      ],
    },
    preset: {
      label: L.preset,
      value: defaults?.preset ?? EVALUATION_DEFAULT_NONE,
      options: withCurrent(
        [
          none(copy.tabDefault(tabDefaults.preset)),
          ...choices.presets.map((p) => ({ value: p, label: p })),
        ],
        defaults?.preset,
      ),
    },
    focusCapabilities: {
      label: L.focusCapabilities,
      options: focusOptions(
        choices.capabilities.map((c) => ({
          value: c.capability,
          label: c.label,
          count: String(c.scenarios),
        })),
        picked,
      ),
      ...(picked.length === 0 ? { fallback: copy.focusNone } : {}),
    },
    focusFixtures: {
      label: L.focusFixtures,
      options: focusOptions(
        choices.fixtures.map((f) => ({ value: f, label: f })),
        pickedFixtures,
      ),
      ...(pickedFixtures.length === 0 ? { fallback: copy.fixturesNone } : {}),
    },
    promptMode: {
      label: L.promptMode,
      value: defaults?.promptMode ?? EVALUATION_DEFAULT_NONE,
      options: [
        none(copy.tabDefault(KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL[tabDefaults.promptMode])),
        ...choices.promptModes.map((m) => ({
          value: m,
          label: KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL[m],
        })),
      ],
    },
    buildMode: {
      label: L.buildMode,
      value: defaults?.buildMode ?? EVALUATION_DEFAULT_NONE,
      options: [
        none(copy.tabDefault(KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL[tabDefaults.buildMode])),
        ...choices.buildModes.map((m) => ({
          value: m,
          label: KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL[m],
        })),
      ],
    },
    concurrency: {
      label: L.concurrency,
      value: concurrency !== undefined ? String(concurrency) : '',
      placeholder: copy.tabDefault(String(tabDefaults.concurrency)),
      hint: copy.concurrencyHint(max),
      ...(concurrency !== undefined && concurrency > max
        ? { error: copy.concurrencyError(max) }
        : {}),
    },
    model: {
      label: L.model,
      kind,
      kinds: (['host', 'cli', 'api'] as const).map((value) => ({
        value,
        label: copy.modelKinds[value],
      })),
      cli: {
        label: copy.cliLabel,
        value: defaults?.cli ?? '',
        options: choices.clis.map((c) => ({ value: c, label: c })),
      },
      modelId: {
        label: copy.modelIdLabel,
        value: defaults?.modelId ?? '',
        placeholder: copy.modelIdPlaceholder,
      },
      llmConfigId: {
        label: copy.llmConfigLabel,
        value: defaults?.llmConfigId ?? '',
        placeholder: copy.llmConfigPlaceholder,
      },
      ...(hasModel ? {} : { fallback: KNOWLEDGE_EVALUATION_HOST_MODEL }),
    },
    ...(defaults ? { clear: copy.clear } : {}),
  }
}
