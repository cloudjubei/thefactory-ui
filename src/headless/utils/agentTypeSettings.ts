import {
  AGENT_RUN_TYPES,
  AGENT_TYPE_SLOT_ROLES,
  AGENT_TYPE_SLOTS,
} from 'thefactory-tools/constants'
import { agentTypeFitsSlot } from 'thefactory-tools/utils'
import type { AgentTypeSlot, AgentTypeSlotMap, ResolvedAgentType } from 'thefactory-tools/types'

import { agentTypeOptionView } from './agentTypeSlotChoice'
import { AGENT_TYPE_SLOT_LABELS } from './agentTypeSlotChoiceConstants'
import type { AgentTypeOptionView } from './agentTypeSlotChoiceTypes'
import {
  AGENT_TYPE_DRAFT_PROBLEMS,
  AGENT_TYPE_PROVING_ROLES,
  AGENT_TYPE_SLOT_FALLBACK_BUILTIN,
  AGENT_TYPE_SLOT_FALLBACK_GROUP,
  AGENT_TYPE_SLOT_SETTING_SOURCES,
} from './agentTypeSettingsConstants'
import type {
  AgentTypeDraft,
  AgentTypeOwner,
  AgentTypeRowView,
  AgentTypeSaveRequest,
  AgentTypeSettingsData,
  AgentTypeSettingsView,
  AgentTypeSlotSettingView,
} from './agentTypeSettingsTypes'

/** The same rule a save applies to an id: it names a file and is cited by frozen plans. */
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

function rowOf(type: ResolvedAgentType, editable: boolean): AgentTypeRowView {
  return {
    ...agentTypeOptionView(type),
    editable,
    ...(type.brief ? { brief: type.brief } : {}),
    ...(type.briefMode ? { briefMode: type.briefMode } : {}),
    ...(type.tools ? { tools: [...type.tools] } : {}),
    contextDocs: [...type.contextDocs],
  }
}

function builtinFor(slot: AgentTypeSlot, types: readonly ResolvedAgentType[]): AgentTypeOptionView {
  const role = AGENT_TYPE_SLOT_ROLES[slot][0]!
  const type = types.find((candidate) => candidate.id === role)
  return agentTypeOptionView(
    type ?? { id: role, label: role, scope: 'builtin', baseRole: role, contextDocs: [] },
  )
}

function optionById(
  id: string,
  types: readonly ResolvedAgentType[],
  slot: AgentTypeSlot,
): AgentTypeOptionView {
  const type = types.find((candidate) => candidate.id === id)
  return agentTypeOptionView(
    type ?? { id, label: id, scope: 'project', baseRole: AGENT_TYPE_SLOT_ROLES[slot][0]! },
  )
}

/**
 * An owner's agent types as its settings show them: the ones it keeps, to edit;
 * for a project, the ones its group gives it, to read; the built-in roles; and
 * each slot's default — what the owner sets, what the slot runs and from where,
 * and what it falls back to when the owner sets nothing. Pure.
 */
export function agentTypeSettingsView(
  data: AgentTypeSettingsData,
  owner: AgentTypeOwner,
): AgentTypeSettingsView {
  const ownScope = owner.kind === 'project' ? 'project' : 'group'
  const types = data.agentTypes
  const own = types.filter((t) => t.scope === ownScope).map((t) => rowOf(t, true))
  const inherited =
    owner.kind === 'project'
      ? types.filter((t) => t.scope === 'group').map((t) => rowOf(t, false))
      : []
  const builtins = types.filter((t) => t.scope === 'builtin').map(agentTypeOptionView)
  const slots: AgentTypeSlotSettingView[] = AGENT_TYPE_SLOTS.map((slot) => {
    const value = owner.kind === 'project' ? data.ownSlotDefaults?.[slot] : data.slotDefaults[slot]
    const inheritedId = owner.kind === 'project' ? data.groupSlotDefaults?.[slot] : undefined
    const effectiveId = value ?? inheritedId
    const source = value
      ? AGENT_TYPE_SLOT_SETTING_SOURCES[ownScope]
      : inheritedId
        ? AGENT_TYPE_SLOT_SETTING_SOURCES.inherited
        : AGENT_TYPE_SLOT_SETTING_SOURCES.builtin
    return {
      slot,
      slotLabel: AGENT_TYPE_SLOT_LABELS[slot],
      ...(value ? { value } : {}),
      effective: effectiveId ? optionById(effectiveId, types, slot) : builtinFor(slot, types),
      sourceLabel: source,
      fallbackLabel: inheritedId
        ? AGENT_TYPE_SLOT_FALLBACK_GROUP(optionById(inheritedId, types, slot).label)
        : AGENT_TYPE_SLOT_FALLBACK_BUILTIN,
      options: types.filter((t) => agentTypeFitsSlot(t, slot)).map(agentTypeOptionView),
    }
  })
  return { own, inherited, builtins, slots }
}

/** A type as its form starts: a stored one to edit, or a new developer-role type. Pure. */
export function agentTypeDraftOf(type?: ResolvedAgentType): AgentTypeDraft {
  return {
    id: type?.id ?? '',
    label: type?.label ?? '',
    description: type?.description ?? '',
    baseRole: type?.baseRole ?? 'developer',
    brief: type?.brief ?? '',
    briefMode: type?.briefMode ?? 'append',
    proves: type?.proves !== false,
    tools: (type?.tools ?? []).join('\n'),
    contextDocs: (type?.contextDocs ?? []).join('\n'),
    isNew: type === undefined,
  }
}

const lines = (text: string): string[] =>
  text
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

/** What saving a draft sends: blank fields left out, lists one entry per line. Pure. */
export function agentTypeSaveRequest(draft: AgentTypeDraft): AgentTypeSaveRequest {
  const description = draft.description.trim()
  const brief = draft.brief.trim()
  const tools = lines(draft.tools)
  const contextDocs = lines(draft.contextDocs)
  const proving = AGENT_TYPE_PROVING_ROLES.includes(draft.baseRole)
  return {
    id: draft.id.trim(),
    body: {
      label: draft.label.trim(),
      ...(description ? { description } : {}),
      baseRole: draft.baseRole,
      ...(brief ? { brief: draft.brief } : {}),
      ...(brief && draft.briefMode === 'replace' ? { briefMode: 'replace' as const } : {}),
      ...(proving && !draft.proves ? { proves: false } : {}),
      ...(tools.length > 0 ? { tools } : {}),
      ...(contextDocs.length > 0 ? { contextDocs } : {}),
    },
  }
}

/**
 * Why a draft will not save yet, or `undefined` when it may be sent — the
 * backend still checks it against the shared rules (tools its role lacks). Pure.
 */
export function agentTypeDraftProblem(
  draft: AgentTypeDraft,
  takenIds: readonly string[],
): string | undefined {
  const id = draft.id.trim()
  if (!SAFE_ID.test(id)) return AGENT_TYPE_DRAFT_PROBLEMS.id
  if ((AGENT_RUN_TYPES as readonly string[]).includes(id))
    return AGENT_TYPE_DRAFT_PROBLEMS.idBuiltin
  if (draft.isNew && takenIds.includes(id)) return AGENT_TYPE_DRAFT_PROBLEMS.idTaken
  if (!draft.label.trim()) return AGENT_TYPE_DRAFT_PROBLEMS.label
  if (draft.briefMode === 'replace' && !draft.brief.trim()) return AGENT_TYPE_DRAFT_PROBLEMS.brief
  return undefined
}

/** An owner's slot defaults with one slot set, or cleared so it falls back. Pure. */
export function agentTypeSlotsWith(
  slots: AgentTypeSlotMap,
  slot: AgentTypeSlot,
  agentTypeId: string | undefined,
): AgentTypeSlotMap {
  const next: AgentTypeSlotMap = { ...slots }
  if (agentTypeId) next[slot] = agentTypeId
  else delete next[slot]
  return next
}
