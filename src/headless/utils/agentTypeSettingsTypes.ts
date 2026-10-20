import type {
  AgentRunType,
  AgentTypeBriefMode,
  AgentTypeSlot,
  AgentTypeSlotMap,
  ResolvedAgentType,
} from 'thefactory-tools/types'

import type { AgentTypeOptionView } from './agentTypeSlotChoiceTypes'

/** Whose agent types a settings screen manages. */
export type AgentTypeOwner =
  | { kind: 'project'; projectId: string }
  | { kind: 'group'; groupId: string }

/** A project's or a group's agent types and slot defaults, as the backend lists them. */
export interface AgentTypeSettingsData {
  agentTypes: ResolvedAgentType[]
  /** The type each slot runs when a launch names none — a project's own over its group's. */
  slotDefaults: AgentTypeSlotMap
  /** A project's own slot defaults. */
  ownSlotDefaults?: AgentTypeSlotMap
  /** The slot defaults a project inherits from its main group. */
  groupSlotDefaults?: AgentTypeSlotMap
  /** A project's main group. */
  groupId?: string
}

/** One type a settings screen lists. */
export interface AgentTypeRowView extends AgentTypeOptionView {
  /** Kept by this owner, so it can be edited and removed here. */
  editable: boolean
  brief?: string
  briefMode?: AgentTypeBriefMode
  tools?: string[]
  contextDocs: string[]
}

/** One slot's default as a settings screen shows it. */
export interface AgentTypeSlotSettingView {
  slot: AgentTypeSlot
  slotLabel: string
  /** The type this owner sets for the slot itself; absent when it sets none. */
  value?: string
  /** The type the slot runs. */
  effective: AgentTypeOptionView
  /** Where the type the slot runs comes from. */
  sourceLabel: string
  /** What the slot runs when this owner sets nothing. */
  fallbackLabel: string
  /** Every type that may fill the slot. */
  options: AgentTypeOptionView[]
}

/** A settings screen's whole view of an owner's agent types. */
export interface AgentTypeSettingsView {
  own: AgentTypeRowView[]
  inherited: AgentTypeRowView[]
  builtins: AgentTypeOptionView[]
  slots: AgentTypeSlotSettingView[]
}

/** A type as its form edits it — lists as text, one entry per line. */
export interface AgentTypeDraft {
  id: string
  label: string
  description: string
  baseRole: AgentRunType
  brief: string
  briefMode: AgentTypeBriefMode
  /** Off for a type that reviews without proving the change. */
  proves: boolean
  tools: string
  contextDocs: string
  /** A type not saved yet: its id may still change. */
  isNew: boolean
}

/** What a save sends: the id it is saved under, and the rest of the type. */
export interface AgentTypeSaveRequest {
  id: string
  body: {
    label: string
    description?: string
    baseRole: AgentRunType
    brief?: string
    briefMode?: AgentTypeBriefMode
    proves?: boolean
    tools?: string[]
    contextDocs?: string[]
  }
}
