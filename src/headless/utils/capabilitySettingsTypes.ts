/** The project or group whose capabilities a panel edits. */
export type CapabilitySettingsOwner =
  | { kind: 'project'; projectId: string }
  | { kind: 'group'; groupId: string }

/** Whose capabilities a settings panel is editing. */
export type CapabilitySettingsScope = 'project' | 'group'

/** A main group passes its flags on; a scope group does not. */
export type CapabilityGroupKind = 'MAIN' | 'SCOPE'

/**
 * The three host-side flags stored on a project and on a group. Each is off
 * unless it is exactly `true`.
 */
export type CapabilityFlagKey = 'connectorWriteBack' | 'autoMerge' | 'autoFollowUp'

/** Flags a record actually states. A missing key is not a choice. */
export type CapabilityFlagMap = Partial<Record<CapabilityFlagKey, boolean>>

/** Where a project's effective flag comes from. */
export type CapabilityFlagSource = 'project' | 'group' | 'default'

/** What a row changes when its switch moves. */
export type CapabilityRowAction =
  | { kind: 'device' }
  | { kind: 'tool-set'; id: string }
  | { kind: 'flag'; key: CapabilityFlagKey }

/** One power as the panel draws it. */
export interface CapabilitySettingsRow {
  id: string
  label: string
  detail: string
  /**
   * A switch is drawn. Locked explanation rows (a group's device automation and
   * tool sets, which each project chooses) leave this false.
   */
  switchable: boolean
  /** Effective on/off. Off unless the winning layer is exactly `true`. */
  on: boolean
  /** The switch is shown and cannot be moved — a scope group does not pass flags on. */
  disabled: boolean
  /** Why the switch is in this position, when that is not obvious from the detail. */
  sourceLabel?: string
  /** Clears a project's own choice so the main group's setting applies again. */
  inheritLabel?: string
  action: CapabilityRowAction
}

/** A headed group of rows. */
export interface CapabilitySettingsSection {
  id: string
  heading: string
  note?: string
  rows: CapabilitySettingsRow[]
}

/**
 * The at-a-glance badge. `Off` when nothing this scope turns on is on; otherwise
 * the one power's name, or a count whose title lists them.
 */
export interface CapabilityBadge {
  on: boolean
  label: string
  /** Spoken and shown on hover: the powers that are on, or why the badge says Off. */
  title: string
}

/** The panel, copy included, so web and native draw the same thing. */
export interface CapabilitySettingsView {
  heading: string
  intro: string
  badge: CapabilityBadge
  sections: CapabilitySettingsSection[]
}

/**
 * What the panel is built from. `toolSets` is the project's `agent-tool-sets`
 * record; omit it for a group, whose device automation and tool sets are each
 * project's own choice. `ok: false` means that record could not be read.
 */
export interface CapabilitySettingsInput {
  scope: CapabilitySettingsScope
  groupKind?: CapabilityGroupKind
  /** The main group's title, for a project that can inherit its flags. */
  groupTitle?: string
  /** This project or group's stored capabilities object. */
  own?: unknown
  /** The main group's capabilities. Ignored for a group scope. */
  inherited?: unknown
  toolSets?: { ok: true; content: unknown } | { ok: false }
}

/** The `agent-tool-sets` record as the panel reads it. */
export interface StoredToolSets {
  toolSets: string[]
  /**
   * Exactly the stored boolean. Absent when the record does not say — the panel
   * treats that as off, and a write stores `false` so a checkout cannot turn it on.
   */
  deviceAutomation?: boolean
}
