import type {
  ProcessInput,
  ProcessInputField,
  ProcessInputRef,
  ProcessInputValue,
  ProcessVariant,
} from 'thefactory-tools/types'

/** A repo a variant takes a ref for: a part of how the product is served, or the project itself. */
export type ProcessLaunchRepo = {
  key: string
  /** What the form calls its ref. */
  label: string
  role?: string
  project?: string
}

/** The repos a refs value asks for, and whether one ref can stand for all of them. */
export type ProcessLaunchRepos = {
  repos: readonly ProcessLaunchRepo[]
  /** The whole product comes from the one project, so one ref can serve it. */
  one?: ProcessLaunchRepo
}

/** One repo's row of a refs value as the form holds it. */
export type ProcessLaunchRefDraft = {
  repo: ProcessLaunchRepo
  ref: string
  /** The patch's text, as the run takes it. */
  patch: string
  /** What the form calls the patch: the note it came from. */
  patchLabel?: string
}

/** What a field of the form holds: words, or a row per repo. */
export type ProcessLaunchFieldDraft = string | readonly ProcessLaunchRefDraft[]

/** One variant as the form holds it. */
export type ProcessLaunchVariantDraft = {
  /** Keeps its row when its label changes. */
  key: string
  label: string
  /** The id the launch named, until its label is changed. */
  id?: string
  values: Readonly<Record<string, ProcessLaunchFieldDraft>>
}

/** What an input holds. */
export type ProcessLaunchValueDraft = ProcessLaunchFieldDraft | readonly ProcessLaunchVariantDraft[]

/** A launch form as filled so far, by input name. */
export type ProcessLaunchDraft = {
  values: Readonly<Record<string, ProcessLaunchValueDraft>>
  /** The next variant's row key. */
  nextKey: number
}

/** What the form sends, by input name. */
export type ProcessLaunchInputValues = Record<string, ProcessInputValue | ProcessVariant[]>

/** The first thing wrong with a form, and the field that holds it. */
export type ProcessLaunchProblem = {
  message: string
  /** The field to mark. */
  fieldKey: string
  /** The variant it is in, to open that row. */
  variantKey?: string
}

/** One chip of a folded variant row. */
export type ProcessLaunchVariantChip = {
  key: string
  kind: 'ref' | 'patch'
  text: string
}

/** A variant folded to one line: its name and what it is made of. */
export type ProcessLaunchVariantRow = {
  key: string
  name: string
  /** Nothing named it yet: it shows as "Variant 2". */
  unnamed: boolean
  chips: readonly ProcessLaunchVariantChip[]
  /** It holds the form's first problem. */
  bad: boolean
}

/** The form's inputs in the order they are drawn: a row of short fields, then each long one. */
export type ProcessLaunchLayout = {
  short: readonly ProcessInput[]
  long: readonly ProcessInput[]
}

export type { ProcessInput, ProcessInputField, ProcessInputRef }
