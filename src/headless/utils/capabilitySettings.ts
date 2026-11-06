import {
  AGENT_TOOL_SETS_KEY,
  AGENT_TOOL_SETS_RECORD_TYPE,
  CAPABILITY_BADGE_OFF,
  CAPABILITY_BADGE_OFF_TITLE,
  CAPABILITY_DEVICE_DETAIL,
  CAPABILITY_DEVICE_LABEL,
  CAPABILITY_FLAG_COPY,
  CAPABILITY_FLAG_KEYS,
  CAPABILITY_PER_PROJECT,
  CAPABILITY_SCOPE_FLAG,
  CAPABILITY_SECTION_DEVICE,
  CAPABILITY_SECTION_FLAGS,
  CAPABILITY_SECTION_TOOL_SETS,
  CAPABILITY_SECTION_TOOL_SETS_NOTE,
  CAPABILITY_SETTINGS_GROUP_INTRO,
  CAPABILITY_SETTINGS_HEADING,
  CAPABILITY_SETTINGS_PROJECT_INTRO,
  CAPABILITY_SETTINGS_SCOPE_INTRO,
  CAPABILITY_SET_ON_PROJECT,
  CAPABILITY_TOOL_SET_CATALOG,
  CAPABILITY_TOOL_SETS_UNREAD,
  capabilityBadgeOnCount,
  capabilityInheritLabel,
  capabilityInheritedOff,
  capabilityInheritedOn,
  capabilityUnknownToolSetDetail,
} from './capabilitySettingsConstants'
import type {
  CapabilityBadge,
  CapabilityFlagKey,
  CapabilityFlagMap,
  CapabilityFlagSource,
  CapabilitySettingsInput,
  CapabilitySettingsRow,
  CapabilitySettingsSection,
  CapabilitySettingsView,
  StoredToolSets,
} from './capabilitySettingsTypes'

export { AGENT_TOOL_SETS_KEY, AGENT_TOOL_SETS_RECORD_TYPE }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The flags a capabilities object states. Anything other than an exact boolean,
 * and any key that is not a flag, is dropped — the same rule the resolver uses,
 * so a typo cannot look saved while the power stays off. Pure.
 */
export function readStoredFlags(value: unknown): CapabilityFlagMap {
  if (!isRecord(value)) return {}
  const flags: CapabilityFlagMap = {}
  for (const key of CAPABILITY_FLAG_KEYS) {
    const flag = value[key]
    if (typeof flag === 'boolean') flags[key] = flag
  }
  return flags
}

/** Flags in catalogue order, so two equal choices stringify the same. Pure. */
export function normalizeFlags(value: unknown): CapabilityFlagMap {
  const stored = readStoredFlags(value)
  const flags: CapabilityFlagMap = {}
  for (const key of CAPABILITY_FLAG_KEYS) {
    if (typeof stored[key] === 'boolean') flags[key] = stored[key]
  }
  return flags
}

/** A stable key for a capabilities object. Absent and empty are the same. */
export function capabilityFlagsKey(value: unknown): string {
  return JSON.stringify(normalizeFlags(value))
}

/**
 * One flag. A project's own boolean wins — `false` opts out of the group — and
 * a flag it leaves out comes from `inherited`. Anything still unset is off. Pure.
 */
export function resolveCapabilityFlag(
  own: boolean | undefined,
  inherited: boolean | undefined,
): { on: boolean; source: CapabilityFlagSource } {
  if (typeof own === 'boolean') return { on: own, source: 'project' }
  if (typeof inherited === 'boolean') return { on: inherited, source: 'group' }
  return { on: false, source: 'default' }
}

/**
 * Project metadata after setting or clearing one flag. `undefined` drops the
 * project's choice so the main group applies again. Other metadata is kept:
 * a project update replaces metadata whole. Pure.
 */
export function withProjectCapabilityFlag(
  metadata: Record<string, unknown> | undefined,
  key: CapabilityFlagKey,
  value: boolean | undefined,
): Record<string, unknown> {
  const flags = readStoredFlags(metadata?.capabilities)
  if (value === undefined) delete flags[key]
  else flags[key] = value
  const { capabilities: _previous, ...rest } = metadata ?? {}
  const next = normalizeFlags(flags)
  return Object.keys(next).length === 0 ? rest : { ...rest, capabilities: next }
}

/**
 * A group's capabilities after one flag changes. The boolean is stored either
 * way — a group has nothing to inherit, and absent would mean the same as
 * `false`, but the choice the person just made stays visible. Pure.
 */
export function withGroupCapabilityFlag(
  current: unknown,
  key: CapabilityFlagKey,
  value: boolean,
): CapabilityFlagMap {
  return normalizeFlags({ ...readStoredFlags(current), [key]: value })
}

/**
 * Tool-set ids and the device-automation switch on an `agent-tool-sets` record.
 * Ids are trimmed strings, once each, in the order stored. The switch is kept
 * only when it is exactly a boolean. Pure.
 */
export function readStoredToolSets(content: unknown): StoredToolSets {
  if (!isRecord(content)) return { toolSets: [] }
  const raw = content.toolSets
  const toolSets: string[] = []
  const seen = new Set<string>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'string') continue
      const id = item.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      toolSets.push(id)
    }
  }
  const device = content.deviceAutomation
  return typeof device === 'boolean' ? { toolSets, deviceAutomation: device } : { toolSets }
}

/** A stable key for a tool-set record. No record and an empty one match. */
export function toolSetsKey(content: unknown): string {
  const stored = readStoredToolSets(content)
  return JSON.stringify({
    toolSets: stored.toolSets,
    deviceAutomation: stored.deviceAutomation === true,
  })
}

/**
 * The record to write for a device-automation choice. Tool sets already stored
 * stay. The boolean is always written, so an absent switch cannot be read as
 * "whatever the checkout looks like". Pure.
 */
export function withDeviceAutomation(
  content: unknown,
  on: boolean,
): { toolSets: string[]; deviceAutomation: boolean } {
  return { toolSets: readStoredToolSets(content).toolSets, deviceAutomation: on }
}

/**
 * The record to write after turning one tool set on or off. Device automation
 * stays on only when the record already says `true`; otherwise it is stored
 * `false`, which is the default. Pure.
 */
export function withToolSet(
  content: unknown,
  id: string,
  on: boolean,
): { toolSets: string[]; deviceAutomation: boolean } {
  const stored = readStoredToolSets(content)
  const without = stored.toolSets.filter((setId) => setId !== id)
  return {
    toolSets: on ? [...without, id] : without,
    deviceAutomation: stored.deviceAutomation === true,
  }
}

const flagRow = (
  key: CapabilityFlagKey,
  on: boolean,
  extras: Pick<CapabilitySettingsRow, 'disabled' | 'sourceLabel' | 'inheritLabel'>,
): CapabilitySettingsRow => ({
  id: `flag-${key}`,
  label: CAPABILITY_FLAG_COPY[key].label,
  detail: CAPABILITY_FLAG_COPY[key].detail,
  switchable: true,
  on,
  action: { kind: 'flag', key },
  ...extras,
})

function projectFlagRow(
  key: CapabilityFlagKey,
  own: boolean | undefined,
  inherited: boolean | undefined,
  groupTitle: string | undefined,
): CapabilitySettingsRow {
  const resolved = resolveCapabilityFlag(own, inherited)
  if (resolved.source === 'project') {
    return flagRow(key, resolved.on, {
      disabled: false,
      sourceLabel: CAPABILITY_SET_ON_PROJECT,
      inheritLabel: capabilityInheritLabel(groupTitle),
    })
  }
  if (resolved.source === 'group' && groupTitle) {
    return flagRow(key, resolved.on, {
      disabled: false,
      sourceLabel: resolved.on
        ? capabilityInheritedOn(groupTitle)
        : capabilityInheritedOff(groupTitle),
    })
  }
  return flagRow(key, false, { disabled: false })
}

function deviceRow(on: boolean, switchable: boolean): CapabilitySettingsRow {
  return {
    id: 'device-automation',
    label: CAPABILITY_DEVICE_LABEL,
    detail: switchable ? CAPABILITY_DEVICE_DETAIL : CAPABILITY_PER_PROJECT,
    switchable,
    on: switchable ? on : false,
    disabled: false,
    action: { kind: 'device' },
  }
}

function toolSetRow(
  id: string,
  label: string,
  detail: string,
  on: boolean,
  switchable: boolean,
): CapabilitySettingsRow {
  return {
    id: `tool-set-${id}`,
    label,
    detail: switchable ? detail : CAPABILITY_PER_PROJECT,
    switchable,
    on: switchable ? on : false,
    disabled: false,
    action: { kind: 'tool-set', id },
  }
}

function toolSetRows(enabled: readonly string[], switchable: boolean): CapabilitySettingsRow[] {
  const known = new Set(CAPABILITY_TOOL_SET_CATALOG.map((set) => set.id))
  const catalog = CAPABILITY_TOOL_SET_CATALOG.map((set) =>
    toolSetRow(set.id, set.label, set.detail, enabled.includes(set.id), switchable),
  )
  const extras = enabled
    .filter((id) => !known.has(id))
    .map((id) => toolSetRow(id, id, capabilityUnknownToolSetDetail, true, switchable))
  return [...catalog, ...extras]
}

function badgeFor(names: readonly string[], toolSetsFailed: boolean): CapabilityBadge {
  const unread = toolSetsFailed ? ` ${CAPABILITY_TOOL_SETS_UNREAD}` : ''
  if (names.length === 0) {
    return {
      on: false,
      label: CAPABILITY_BADGE_OFF,
      title: `${CAPABILITY_BADGE_OFF_TITLE}.${unread}`,
    }
  }
  const title = `${names.join(', ')}.${unread}`
  if (names.length === 1) return { on: true, label: names[0]!, title }
  return { on: true, label: capabilityBadgeOnCount(names.length), title }
}

function onNames(rows: readonly CapabilitySettingsRow[]): string[] {
  return rows.filter((row) => row.switchable && row.on).map((row) => row.label)
}

/**
 * The capabilities panel for a project or a group: device automation, tool sets
 * and the three flags, each off unless it is exactly on, plus the badge that
 * says so at a glance. A group does not choose device automation or tool sets.
 * A scope group's flags are shown off and locked, because projects do not
 * inherit them. Pure.
 */
export function capabilitySettingsView(input: CapabilitySettingsInput): CapabilitySettingsView {
  const own = readStoredFlags(input.own)
  const inherited = input.scope === 'project' ? readStoredFlags(input.inherited) : {}
  const scopeGroup = input.scope === 'group' && input.groupKind === 'SCOPE'
  const toolSetsFailed = input.toolSets?.ok === false
  const storedTools =
    input.scope === 'project' && input.toolSets?.ok === true
      ? readStoredToolSets(input.toolSets.content)
      : undefined

  const flags = CAPABILITY_FLAG_KEYS.map((key) =>
    input.scope === 'group'
      ? flagRow(key, scopeGroup ? false : own[key] === true, {
          disabled: scopeGroup,
          ...(scopeGroup ? { sourceLabel: CAPABILITY_SCOPE_FLAG } : {}),
        })
      : projectFlagRow(key, own[key], inherited[key], input.groupTitle),
  )

  const device = deviceRow(storedTools?.deviceAutomation === true, input.scope === 'project')
  const sets = toolSetRows(storedTools?.toolSets ?? [], input.scope === 'project')

  const sections: CapabilitySettingsSection[] = []
  if (input.scope === 'group' || input.toolSets?.ok === true) {
    sections.push({ id: 'device', heading: CAPABILITY_SECTION_DEVICE, rows: [device] })
    sections.push({
      id: 'tool-sets',
      heading: CAPABILITY_SECTION_TOOL_SETS,
      ...(input.scope === 'project' ? { note: CAPABILITY_SECTION_TOOL_SETS_NOTE } : {}),
      rows: sets,
    })
  } else if (toolSetsFailed) {
    sections.push({
      id: 'tool-sets',
      heading: CAPABILITY_SECTION_TOOL_SETS,
      note: CAPABILITY_TOOL_SETS_UNREAD,
      rows: [],
    })
  }
  sections.push({ id: 'flags', heading: CAPABILITY_SECTION_FLAGS, rows: flags })

  const counted = input.scope === 'project' && !toolSetsFailed ? [device, ...sets, ...flags] : flags
  return {
    heading: CAPABILITY_SETTINGS_HEADING,
    intro:
      input.scope === 'project'
        ? CAPABILITY_SETTINGS_PROJECT_INTRO
        : scopeGroup
          ? CAPABILITY_SETTINGS_SCOPE_INTRO
          : CAPABILITY_SETTINGS_GROUP_INTRO,
    badge: badgeFor(onNames(counted), toolSetsFailed),
    sections,
  }
}
