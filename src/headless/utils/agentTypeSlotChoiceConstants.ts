import type { AgentTypeScope, AgentTypeSlot, AgentTypeSlotSource } from 'thefactory-tools/types'

/** What each process slot is called on the launch card and in settings. */
export const AGENT_TYPE_SLOT_LABELS: Readonly<Record<AgentTypeSlot, string>> = {
  implementer: 'Implementer',
  verifier: 'Verifier',
}

/** Where a type comes from, as its tag says it. */
export const AGENT_TYPE_SCOPE_LABELS: Readonly<Record<AgentTypeScope, string>> = {
  builtin: 'Built-in',
  group: 'Group',
  project: 'Project',
}

/** Where a slot's proposed type came from, as the card says it. */
export const AGENT_TYPE_SLOT_SOURCE_LABELS: Readonly<Record<AgentTypeSlotSource, string>> = {
  launch: 'Proposed',
  project: 'Project default',
  group: 'Group default',
  builtin: 'Built-in',
}

/** Said of a slot the person changed on the card. */
export const AGENT_TYPE_SLOT_PICKED_LABEL = 'Your pick'

/** Heads the launch card's slot choices. */
export const AGENT_TYPE_SLOTS_HEADING = 'Agents'

/** Said under a slot's choices: what picking another type means. */
export const AGENT_TYPE_SLOT_NOTE =
  'The type each step in this slot runs as. Only types of the matching role are listed.'

/** Said for a type that reviews without proving the change. */
export const AGENT_TYPE_NOT_PROVING_TAG = 'Reviews only'
