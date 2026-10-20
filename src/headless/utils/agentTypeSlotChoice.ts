import { AGENT_TYPE_SLOT_ROLES, AGENT_TYPE_SLOTS } from 'thefactory-tools/constants'
import type {
  AgentTypeOption,
  AgentTypeSlot,
  AgentTypeSlotMap,
  ProcessProposal,
  ProcessProposalNode,
} from 'thefactory-tools/types'

import { agentRoleLabel } from './agentRole'
import {
  AGENT_TYPE_SCOPE_LABELS,
  AGENT_TYPE_SLOT_LABELS,
  AGENT_TYPE_SLOT_PICKED_LABEL,
  AGENT_TYPE_SLOT_SOURCE_LABELS,
} from './agentTypeSlotChoiceConstants'
import type {
  AgentTypeOptionView,
  AgentTypeSlotPicks,
  AgentTypeSlotRowView,
  AgentTypeSlotsMetadata,
} from './agentTypeSlotChoiceTypes'

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/** A type as the card and settings list it: a built-in role by its role, a type by its label. Pure. */
export function agentTypeOptionView(
  type: Pick<AgentTypeOption, 'id' | 'label' | 'description' | 'scope' | 'baseRole' | 'proves'>,
): AgentTypeOptionView {
  return {
    id: type.id,
    label: type.scope === 'builtin' ? capitalized(agentRoleLabel(type.baseRole)) : type.label,
    ...(type.description ? { description: type.description } : {}),
    scope: type.scope,
    scopeLabel: AGENT_TYPE_SCOPE_LABELS[type.scope],
    baseRole: type.baseRole,
    roleLabel: agentRoleLabel(type.baseRole),
    ...(type.proves === false ? { notProving: true as const } : {}),
  }
}

function optionFor(
  proposal: ProcessProposal,
  id: string,
  slot: AgentTypeSlot,
): AgentTypeOptionView {
  const type = proposal.agentTypes?.find((candidate) => candidate.id === id)
  return agentTypeOptionView(
    type ?? { id, label: id, scope: 'project', baseRole: AGENT_TYPE_SLOT_ROLES[slot][0]! },
  )
}

/** The slots some step of the proposal fills, nested processes included. Pure. */
function filledSlots(nodes: readonly ProcessProposalNode[], into = new Set<AgentTypeSlot>()) {
  for (const node of nodes) {
    if (node.slot) into.add(node.slot)
    if (node.children) filledSlots(node.children, into)
  }
  return into
}

/** The proposal's slot offers for the slots its steps fill. */
function offeredSlots(proposal: ProcessProposal | undefined) {
  if (!proposal?.agentTypeSlots) return []
  const filled = filledSlots(proposal.steps)
  return proposal.agentTypeSlots.filter((offer) => filled.has(offer.slot))
}

/**
 * The launch card's slots — those a step of the proposal fills: for each, the type it runs — the person's pick when
 * it is one the slot takes, else the one proposed, else the built-in — where
 * that came from, and every type of the matching role. Pure.
 */
export function agentTypeSlotRows(
  proposal: ProcessProposal | undefined,
  picks: AgentTypeSlotPicks,
): AgentTypeSlotRowView[] {
  if (!proposal) return []
  return offeredSlots(proposal).map((offer) => {
    const proposedId = offer.agentTypeId ?? AGENT_TYPE_SLOT_ROLES[offer.slot][0]!
    const pick = picks[offer.slot]
    const picked = pick !== undefined && offer.options.includes(pick) ? pick : undefined
    const changed = picked !== undefined && picked !== proposedId
    return {
      slot: offer.slot,
      slotLabel: AGENT_TYPE_SLOT_LABELS[offer.slot],
      chosen: optionFor(proposal, picked ?? proposedId, offer.slot),
      sourceLabel: changed
        ? AGENT_TYPE_SLOT_PICKED_LABEL
        : AGENT_TYPE_SLOT_SOURCE_LABELS[offer.source],
      changed,
      options: offer.options.map((id) => optionFor(proposal, id, offer.slot)),
    }
  })
}

/**
 * The approval's metadata for the slots: each slot that runs a type of its own
 * or that the person picked, mapped to the type it runs. `undefined` when every
 * slot runs its built-in as proposed. Pure.
 */
export function agentTypeSlotsMetadata(
  proposal: ProcessProposal | undefined,
  picks: AgentTypeSlotPicks,
): AgentTypeSlotsMetadata | undefined {
  const agentTypeSlots: AgentTypeSlotMap = {}
  for (const offer of offeredSlots(proposal)) {
    const pick = picks[offer.slot]
    const chosen = pick !== undefined && offer.options.includes(pick) ? pick : offer.agentTypeId
    if (chosen) agentTypeSlots[offer.slot] = chosen
  }
  return Object.keys(agentTypeSlots).length > 0 ? { agentTypeSlots } : undefined
}

/** The slots an ask proposed, by slot — each named with a type id; `undefined` when none are. Pure. */
export function agentTypeSlotsOf(value: unknown): AgentTypeSlotMap | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const slots: AgentTypeSlotMap = {}
  for (const slot of AGENT_TYPE_SLOTS) {
    const id = record[slot]
    if (typeof id === 'string' && id.trim()) slots[slot] = id.trim()
  }
  return Object.keys(slots).length > 0 ? slots : undefined
}
