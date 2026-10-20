import type {
  AgentRunType,
  AgentTypeScope,
  AgentTypeSlot,
  AgentTypeSlotMap,
} from 'thefactory-tools/types'

/** The type the person picked for each slot on the card, by slot. */
export type AgentTypeSlotPicks = Partial<Record<AgentTypeSlot, string>>

/** One agent type as the card and settings list it. */
export interface AgentTypeOptionView {
  id: string
  label: string
  description?: string
  scope: AgentTypeScope
  scopeLabel: string
  baseRole: AgentRunType
  roleLabel: string
  /** Set for a type that reviews without proving the change. */
  notProving?: true
}

/** One slot on the launch card: the type it runs, where that came from, and what else may run there. */
export interface AgentTypeSlotRowView {
  slot: AgentTypeSlot
  slotLabel: string
  chosen: AgentTypeOptionView
  sourceLabel: string
  /** The person picked another type than the one proposed. */
  changed: boolean
  options: AgentTypeOptionView[]
}

/** The approval's metadata for the slots: the type each runs, as approved. */
export interface AgentTypeSlotsMetadata {
  agentTypeSlots: AgentTypeSlotMap
}
