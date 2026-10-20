import type { AgentRunType } from 'thefactory-tools/types'

/** The settings section's heading. */
export const AGENT_TYPE_SETTINGS_HEADING = 'Agent types'

/** Under the heading: what agent types are, for a project. */
export const AGENT_TYPE_SETTINGS_PROJECT_INTRO =
  "Types this project's processes can run, on top of the built-in roles. Each runs as a base role, with its own brief, tools and docs."

/** Under the heading: what agent types are, for a group. */
export const AGENT_TYPE_SETTINGS_GROUP_INTRO =
  'Types every project in this group can run, unless a project keeps its own of the same id.'

/** Heads the slot defaults. */
export const AGENT_TYPE_SLOT_DEFAULTS_HEADING = 'Slot defaults'

/** Under the slot defaults: what they do. */
export const AGENT_TYPE_SLOT_DEFAULTS_NOTE =
  'The type each slot runs when a launch picks none. A launch can still change it.'

/** Heads an owner's own types. */
export const AGENT_TYPE_OWN_HEADING = 'Types'

/** Heads the types a project inherits from its group. */
export const AGENT_TYPE_INHERITED_HEADING = 'From the group'

/** Heads the built-in roles. */
export const AGENT_TYPE_BUILTINS_HEADING = 'Built-in roles'

/** Said where an owner keeps no types of its own. */
export const AGENT_TYPE_NONE_YET = 'No types yet.'

/** Where a slot's type comes from, as its settings say it. */
export const AGENT_TYPE_SLOT_SETTING_SOURCES = {
  project: 'Project',
  group: 'Group',
  inherited: 'From group',
  builtin: 'Built-in',
} as const

/** What a slot runs when its owner sets nothing and nothing is inherited. */
export const AGENT_TYPE_SLOT_FALLBACK_BUILTIN = 'Built-in'

/** What a project's slot runs when it sets nothing: its group's default. */
export const AGENT_TYPE_SLOT_FALLBACK_GROUP = (label: string): string => `Group default (${label})`

/** The form's field labels. */
export const AGENT_TYPE_FIELD_LABELS = {
  id: 'Id',
  label: 'Name',
  description: 'Description',
  baseRole: 'Base role',
  brief: 'Brief',
  briefReplaces: "Replace the role's brief",
  proves: 'Proves the change',
  tools: 'Tools',
  contextDocs: 'Docs to read first',
} as const

/** The form's hints under its fields. */
export const AGENT_TYPE_FIELD_HINTS = {
  id: 'Letters, digits, dots, dashes or underscores. Processes name the type by it.',
  tools: "One per line. Narrows the role's tools; leave empty to keep them all.",
  contextDocs: 'One project path per line.',
  proves: 'Off for a reviewer that files a verdict without proving the change.',
} as const

/** The settings' buttons. */
export const AGENT_TYPE_ACTIONS = {
  add: 'New type',
  edit: 'Edit',
  remove: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
} as const

/** What deleting a type asks first. */
export const AGENT_TYPE_REMOVE_CONFIRM = (label: string): string =>
  `Delete “${label}”? A process or slot default that names it will refuse to start until it names another.`

/** The roles a type may be marked as not proving the change on. */
export const AGENT_TYPE_PROVING_ROLES: readonly AgentRunType[] = ['verifier', 'developer-verifier']

/** Why the form will not save yet. */
export const AGENT_TYPE_DRAFT_PROBLEMS = {
  id: 'Give the type an id: letters, digits, dots, dashes or underscores.',
  idTaken: 'Another type already has this id.',
  idBuiltin: 'That id is a built-in role.',
  label: 'Give the type a name.',
  brief: "A type that replaces the role's brief needs a brief.",
} as const
