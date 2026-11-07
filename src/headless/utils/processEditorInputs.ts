import type {
  ProcessDefinition,
  ProcessInput,
  ProcessInputField,
  ProcessInputKind,
  ProcessStep,
} from 'thefactory-tools/types'
import {
  processInputDefinitionProblems,
  processStorylessLaunchProblem,
} from 'thefactory-tools/utils'

/** What the process editor says of a process's inputs and its steps' new switches. */
export const PROCESS_EDITOR_COPY = {
  inputsHeading: 'Inputs',
  inputsHint: 'What a launch fills in. A process with inputs can start with no story.',
  addInput: 'Add input',
  addField: 'Add field',
  remove: 'Remove',
  fieldsHeading: 'Each variant holds',
  inputName: 'Name',
  inputLabel: 'Label',
  inputKind: 'Kind',
  required: 'Required',
  expand: 'One per',
  expandNone: 'Once',
  expandFeatures: 'Feature',
  expandInput: (label: string): string => `Variant of ${label}`,
  mayChangeNothing: 'May change nothing',
  mayChangeNothingHint: 'An attempt that commits nothing still passes.',
  serveVariant: 'Serve its variant',
  serveVariantHint: 'The product is up at the variant’s refs before the agent starts.',
  seededNote:
    'This process ships with Overseer. Once you edit it, it is yours and Overseer updates leave it alone.',
} as const

export const PROCESS_INPUT_KIND_LABELS: Readonly<Record<ProcessInputKind, string>> = {
  text: 'Text',
  'note-reference': 'Note',
  number: 'Number',
  refs: 'Refs',
  variants: 'Variants',
}

/** The kinds an input can be; a variant's field holds anything but variants. Pure. */
export function processInputKindChoices(nested: boolean): ProcessInputKind[] {
  const kinds = Object.keys(PROCESS_INPUT_KIND_LABELS) as ProcessInputKind[]
  return nested ? kinds.filter((kind) => kind !== 'variants') : kinds
}

/** A blank input for the editor's "Add input". Pure. */
export function blankProcessInput(index: number): ProcessInput {
  return { name: `input-${index}`, label: `Input ${index}`, kind: 'text' }
}

/** A blank variant field for the editor's "Add field". Pure. */
export function blankProcessInputField(index: number): ProcessInputField {
  return { name: `field-${index}`, label: `Field ${index}`, kind: 'text' }
}

/**
 * A process with one input changed: a step that fans out over it follows its
 * new name, a variants input keeps the fields it has and any other holds none. Pure.
 */
export function setProcessInput(
  definition: ProcessDefinition,
  index: number,
  over: Partial<ProcessInput>,
): ProcessDefinition {
  const before = definition.inputs?.[index]
  if (!before) return definition
  const merged: ProcessInput = { ...before, ...over }
  const { fields, ...rest } = merged
  const next: ProcessInput = merged.kind === 'variants' ? { ...rest, fields: fields ?? [] } : rest
  const renamed = next.name !== before.name
  const stopsFanning = before.kind === 'variants' && next.kind !== 'variants'
  return {
    ...definition,
    inputs: definition.inputs?.map((input, at) => (at === index ? next : input)),
    steps: definition.steps.map((step) => {
      const over = step.expand
      if (typeof over !== 'object' || over.input !== before.name) return step
      if (stopsFanning) {
        const { expand: _gone, ...kept } = step
        return kept
      }
      return renamed ? { ...step, expand: { input: next.name } } : step
    }),
  }
}

/** What a process step can fan out over: its features, or a variants input. Pure. */
export function processExpandChoices(
  definition: Pick<ProcessDefinition, 'inputs'>,
): { value: string; label: string }[] {
  return [
    { value: '', label: PROCESS_EDITOR_COPY.expandNone },
    { value: 'features', label: PROCESS_EDITOR_COPY.expandFeatures },
    ...(definition.inputs ?? [])
      .filter((input) => input.kind === 'variants')
      .map((input) => ({
        value: `input:${input.name}`,
        label: PROCESS_EDITOR_COPY.expandInput(input.label),
      })),
  ]
}

/** A step's fan-out as the picker holds it. Pure. */
export function processExpandOf(step: Pick<ProcessStep, 'expand'>): string {
  if (!step.expand) return ''
  return step.expand === 'features' ? 'features' : `input:${step.expand.input}`
}

/** A step fanning out as the picker says. Pure. */
export function withProcessExpand(step: ProcessStep, value: string): ProcessStep {
  const { expand: _before, ...rest } = step
  if (value === 'features') return { ...rest, expand: 'features' }
  if (value.startsWith('input:')) return { ...rest, expand: { input: value.slice(6) } }
  return rest
}

/** What is wrong with a process's inputs, for the editor to say before it is saved. Pure. */
export function processDefinitionInputProblems(
  definition: Pick<ProcessDefinition, 'inputs'>,
): string[] {
  return processInputDefinitionProblems(definition.inputs)
}

/** Whether a process ships with Overseer as it is, unedited: a save makes it the person's own. Pure. */
export function isSeededProcess(definition: Pick<ProcessDefinition, 'seeded'>): boolean {
  return definition.seeded === true
}

/** Whether a process starts from a form of inputs, with no story. Pure. */
export function processStartsFromForm(
  definition: Pick<ProcessDefinition, 'id' | 'name' | 'steps' | 'inputs'>,
): boolean {
  return (
    (definition.inputs?.length ?? 0) > 0 && processStorylessLaunchProblem(definition) === undefined
  )
}
