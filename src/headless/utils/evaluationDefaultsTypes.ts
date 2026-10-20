/** How the defaults name a model: none (the host's), a CLI with its model, or an API config. */
export type EvaluationModelKind = 'host' | 'cli' | 'api'

/** One option of a choice: the value it sets, and how it reads. */
export type EvaluationChoiceOption = { value: string; label: string }

/** A single choice the field offers, with the option for "not set" first. */
export type EvaluationChoiceView = {
  label: string
  /** The option set, or the "not set" option's value. */
  value: string
  options: EvaluationChoiceOption[]
}

/** One name a focus may take, picked or not. */
export type EvaluationFocusOption = {
  value: string
  label: string
  /** How many scenarios it holds, when known. */
  count?: string
  selected: boolean
}

/** A focus list: every name it may take, and what an empty one means. */
export type EvaluationFocusView = {
  label: string
  options: EvaluationFocusOption[]
  /** What it falls back to while nothing is picked; absent once something is. */
  fallback?: string
}

/** The project editor's evaluation defaults field, ready to draw. */
export type EvaluationDefaultsFieldView = {
  title: string
  /** What the defaults are for. */
  hint: string
  /** The defaults in one line. */
  summary: string
  stage: EvaluationChoiceView
  preset: EvaluationChoiceView
  focusCapabilities: EvaluationFocusView
  focusFixtures: EvaluationFocusView
  promptMode: EvaluationChoiceView
  buildMode: EvaluationChoiceView
  concurrency: {
    label: string
    value: string
    placeholder: string
    hint: string
    error?: string
  }
  model: {
    label: string
    kind: EvaluationModelKind
    kinds: Array<{ value: EvaluationModelKind; label: string }>
    cli: EvaluationChoiceView
    modelId: { value: string; placeholder: string; label: string }
    llmConfigId: { value: string; placeholder: string; label: string }
    /** What the model falls back to while none is set; absent once one is. */
    fallback?: string
  }
  /** Clears every default. Absent when none is set. */
  clear?: string
}

/** A setting the field edits through one of its choices. */
export type EvaluationChoiceKey = 'stage' | 'preset' | 'promptMode' | 'buildMode'

/** A focus list the field edits. */
export type EvaluationFocusKey = 'focusCapabilities' | 'focusFixtures'
