import type { SignOffOutputDefinition } from '../api/generated'
import type { AgentTypeOwner } from './agentTypeSettingsTypes'

/** The project or the group whose sign-off outputs these are. */
export type SignOffOutputOwner = AgentTypeOwner

/** What the add and edit forms hold. */
export type SignOffOutputFormDraft = SignOffOutputDefinition

export type SignOffOutputsLayout = 'rows' | 'folds' | 'cards'

/** The note a template can be: its id and its name. */
export type SignOffTemplateChoice = { id: string; label: string }

/** A note as these screens read it: a summary, which never carries a value. */
export type SignOffTemplateNote = { id: string; label: string; kind: string }

/** One output as Settings shows it. */
export type SignOffOutputSettingView = {
  /** The label as the backend compares it. */
  key: string
  label: string
  definition: SignOffOutputDefinition
  shapeLabel: string
  templateLabel: string
  /** Why a run would write this with no template. */
  templateProblem?: string
  /** False for what a project gets from its main group. */
  editable: boolean
  sourceLabel?: string
  /** The group it comes from, read-only here. */
  groupTitle?: string
  /** The group output this project's own takes the place of. */
  replaces?: string
}

/** What {@link signOffOutputSettingViews} works from. */
export type SignOffOutputSettingViewsInput = {
  own: readonly SignOffOutputDefinition[]
  ownNotes: readonly SignOffTemplateNote[]
  mainGroup?: {
    id: string
    title: string
    type: 'MAIN' | 'SCOPE'
    signOffOutputs?: SignOffOutputDefinition[]
  }
  groupNotes?: readonly SignOffTemplateNote[]
  /** The notes are in, so one that is not there is gone. */
  notesRead: boolean
}
