import type { CapabilityFlagKey } from './capabilitySettingsTypes'

/** The settings section's heading. */
export const CAPABILITY_SETTINGS_HEADING = 'Capabilities'

/** Under the heading, for a project. */
export const CAPABILITY_SETTINGS_PROJECT_INTRO =
  'Host-side powers stay off until you turn them on. This project follows its main group wherever it has not chosen for itself.'

/** Under the heading, for a main group. */
export const CAPABILITY_SETTINGS_GROUP_INTRO =
  'Host-side powers stay off until you turn them on. A project in this group follows these unless that project chooses for itself.'

/** Under the heading, for a scope group — its flags are not inherited. */
export const CAPABILITY_SETTINGS_SCOPE_INTRO =
  'Host-side powers stay off until you turn them on. A scope group does not pass them on: a project follows its main group, or its own choice.'

/** The badge when nothing this scope turns on is on. */
export const CAPABILITY_BADGE_OFF = 'Off'

/** Spoken form of {@link CAPABILITY_BADGE_OFF}. */
export const CAPABILITY_BADGE_OFF_TITLE = 'Every capability is off'

/** The badge when more than one power is on. */
export const capabilityBadgeOnCount = (count: number): string => `${count} on`

/** Said when the tool-set record could not be read, appended to the badge title. */
export const CAPABILITY_TOOL_SETS_UNREAD = 'Device automation and tool sets could not be read.'

export const CAPABILITY_SECTION_DEVICE = 'Driving a device'

export const CAPABILITY_SECTION_TOOL_SETS = 'Tool sets'

export const CAPABILITY_SECTION_TOOL_SETS_NOTE =
  "Extra tools this project's agents may use. None are on until you turn a set on."

export const CAPABILITY_SECTION_FLAGS = 'Automatic actions'

/** Where a group's device automation and tool sets are actually chosen. */
export const CAPABILITY_PER_PROJECT = 'Each project turns this on in its own settings.'

/** Under a scope group's flag switch, which does not pass the flag on. */
export const CAPABILITY_SCOPE_FLAG = 'A scope group does not pass this on.'

/** The flag keys, in the order the panel lists them. */
export const CAPABILITY_FLAG_KEYS = [
  'connectorWriteBack',
  'autoMerge',
  'autoFollowUp',
] as const satisfies readonly CapabilityFlagKey[]

/** Copy for one flag. */
export const CAPABILITY_FLAG_COPY: Record<CapabilityFlagKey, { label: string; detail: string }> = {
  connectorWriteBack: {
    label: 'Connector write-back',
    detail:
      'Write tickets and comments back to the connected tracker. Off leaves connectors read-only.',
  },
  autoMerge: {
    label: 'Auto-merge',
    detail: 'Merge approved work without asking again. Off leaves the branch for you to merge.',
  },
  autoFollowUp: {
    label: 'Auto-follow-up',
    detail: 'Start a follow-up turn when a run finishes. Off waits for you.',
  },
}

export const CAPABILITY_DEVICE_LABEL = 'Device automation'

export const CAPABILITY_DEVICE_DETAIL =
  "Agents may build this project's app and drive it on a device. Off until you turn it on — a mobile checkout does not turn it on."

/**
 * The per-project data record whose content is `{ toolSets, deviceAutomation }`.
 * The same type and key the backend reads in `projectToolSets`.
 */
export const AGENT_TOOL_SETS_RECORD_TYPE = 'agent-tool-sets'

/** The one record key that flag lives under. */
export const AGENT_TOOL_SETS_KEY = 'config'

/**
 * Tool sets the panel always offers, in list order. An id already stored and not
 * listed here is still shown, so it can be turned off.
 */
export const CAPABILITY_TOOL_SET_CATALOG: readonly { id: string; label: string; detail: string }[] =
  [
    {
      id: 'trainer',
      label: 'Model trainer',
      detail: 'Training and run tools for a model-trainer project.',
    },
    {
      id: 'knowledge',
      label: 'Code knowledge',
      detail: "The code-knowledge map on this project's chats and runs.",
    },
  ]

/** Detail for a stored tool-set id the catalogue does not name. */
export const capabilityUnknownToolSetDetail = 'An extra tool set turned on for this project.'

export const CAPABILITY_SET_ON_PROJECT = 'Set on this project'

export const capabilityInheritLabel = (groupTitle?: string): string =>
  groupTitle ? `Use ${groupTitle}'s setting` : 'Use the default'

export const capabilityInheritedOn = (groupTitle: string): string =>
  `On — ${groupTitle} turns this on`

export const capabilityInheritedOff = (groupTitle: string): string =>
  `Off — ${groupTitle} leaves this off`
