import { resolveSignOffOutputs, signOffOutputKey } from 'thefactory-tools/utils'

import type { SignOffOutputDefinition } from '../api/generated'
import { SIGN_OFF_OUTPUT_COPY, SIGN_OFF_OUTPUT_PROBLEMS } from './signOffOutputSettingsConstants'
import type {
  SignOffOutputFormDraft,
  SignOffOutputOwner,
  SignOffOutputSettingView,
  SignOffOutputSettingViewsInput,
  SignOffTemplateChoice,
  SignOffTemplateNote,
} from './signOffOutputSettingsTypes'

/** A list the backend would keep as definitions. */
export function isSignOffOutputList(value: unknown): value is SignOffOutputDefinition[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      const output = item as Partial<SignOffOutputDefinition> | null
      return (
        typeof output?.label === 'string' &&
        typeof output.templateNoteId === 'string' &&
        typeof output.perRepo === 'boolean'
      )
    })
  )
}

/** A project's own outputs, as stored in its metadata. */
export function readSignOffOutputs(metadata: unknown): SignOffOutputDefinition[] {
  const value = (metadata as { signOffOutputs?: unknown } | undefined)?.signOffOutputs
  return isSignOffOutputList(value) ? value : []
}

/**
 * A project's metadata with this list. An empty list drops the key outright: a
 * project update replaces its metadata whole, so an absent key is what none is.
 */
export function withSignOffOutputs(
  metadata: Record<string, unknown> | undefined,
  outputs: readonly SignOffOutputDefinition[],
): Record<string, unknown> {
  const { signOffOutputs: _previous, ...rest } = metadata ?? {}
  return outputs.length > 0 ? { ...rest, signOffOutputs: outputs } : rest
}

/** The list with `output` saved: in the place of the one with key `editing`, else at the end. */
export function withSavedSignOffOutput(
  outputs: readonly SignOffOutputDefinition[],
  output: SignOffOutputDefinition,
  editing: string | undefined,
): SignOffOutputDefinition[] {
  const at = outputs.findIndex((item) => signOffOutputKey(item.label) === editing)
  if (at < 0) return [...outputs, output]
  return outputs.map((item, index) => (index === at ? output : item))
}

export function withoutSignOffOutput(
  outputs: readonly SignOffOutputDefinition[],
  key: string,
): SignOffOutputDefinition[] {
  const wanted = signOffOutputKey(key)
  return outputs.filter((item) => signOffOutputKey(item.label) !== wanted)
}

/** The notes a template can be. A secret note gives a run nothing, so it is never offered. */
export function signOffTemplateChoices(
  notes: readonly SignOffTemplateNote[],
): SignOffTemplateChoice[] {
  return notes.filter((note) => note.kind !== 'secret').map(({ id, label }) => ({ id, label }))
}

/** Why a draft cannot be saved: the backend refuses two outputs with one label. */
export function signOffOutputDraftProblem(
  draft: SignOffOutputFormDraft,
  context: {
    outputs: readonly SignOffOutputDefinition[]
    choices: readonly SignOffTemplateChoice[]
    editing?: string
  },
): string | undefined {
  if (!draft.label.trim()) return SIGN_OFF_OUTPUT_PROBLEMS.label
  const key = signOffOutputKey(draft.label)
  const repeated = context.outputs.some((output) => {
    const other = signOffOutputKey(output.label)
    return other === key && other !== context.editing
  })
  if (repeated) return SIGN_OFF_OUTPUT_PROBLEMS.repeated
  return context.choices.some((choice) => choice.id === draft.templateNoteId)
    ? undefined
    : SIGN_OFF_OUTPUT_PROBLEMS.template
}

/** The definition saved from a draft, with exactly the fields the backend keeps. */
export function signOffOutputOfDraft(draft: SignOffOutputFormDraft): SignOffOutputDefinition {
  return {
    label: draft.label.trim(),
    templateNoteId: draft.templateNoteId.trim(),
    perRepo: draft.perRepo,
  }
}

export function signOffOutputDraftOf(output: SignOffOutputDefinition): SignOffOutputFormDraft {
  return { ...output }
}

function templateOf(
  output: SignOffOutputDefinition,
  notes: readonly SignOffTemplateNote[],
  notesRead: boolean,
): Pick<SignOffOutputSettingView, 'templateLabel' | 'templateProblem'> {
  if (!notesRead) return { templateLabel: SIGN_OFF_OUTPUT_COPY.templateLoading }
  const note = signOffTemplateChoices(notes).find((item) => item.id === output.templateNoteId)
  return note
    ? { templateLabel: note.label }
    : {
        templateLabel: SIGN_OFF_OUTPUT_COPY.deletedNote,
        templateProblem: SIGN_OFF_OUTPUT_COPY.templateGone,
      }
}

/** Every output that reaches this owner: its own first, then a project's from its main group. */
export function signOffOutputSettingViews(
  input: SignOffOutputSettingViewsInput,
): SignOffOutputSettingView[] {
  const { own, ownNotes, mainGroup, groupNotes = [], notesRead } = input
  const fromGroup = mainGroup?.type === 'MAIN' ? (mainGroup.signOffOutputs ?? []) : []
  const groupKeys = new Set(fromGroup.map((output) => signOffOutputKey(output.label)))
  return resolveSignOffOutputs(own, mainGroup).map(({ definition, source }) => {
    const key = signOffOutputKey(definition.label)
    const base = {
      key,
      label: definition.label,
      definition,
      shapeLabel: definition.perRepo
        ? SIGN_OFF_OUTPUT_COPY.perRepo
        : SIGN_OFF_OUTPUT_COPY.oneForAll,
    }
    if (source === 'project') {
      return {
        ...base,
        ...templateOf(definition, ownNotes, notesRead),
        editable: true,
        ...(mainGroup && groupKeys.has(key)
          ? { replaces: SIGN_OFF_OUTPUT_COPY.replaces(mainGroup.title) }
          : {}),
      }
    }
    const groupTitle = mainGroup?.title ?? ''
    return {
      ...base,
      ...templateOf(definition, groupNotes, notesRead),
      editable: false,
      sourceLabel: SIGN_OFF_OUTPUT_COPY.fromGroup(groupTitle),
      groupTitle,
    }
  })
}

/** Who gets these outputs. */
export function signOffOutputsIntro(
  owner: SignOffOutputOwner,
  title: string,
  groupType?: 'MAIN' | 'SCOPE',
): string {
  if (owner.kind === 'project') return SIGN_OFF_OUTPUT_COPY.projectIntro(title)
  return groupType === 'SCOPE'
    ? SIGN_OFF_OUTPUT_COPY.scopeGroup(title)
    : SIGN_OFF_OUTPUT_COPY.mainGroupIntro(title)
}
