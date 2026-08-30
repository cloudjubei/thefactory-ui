import type {
  ChatToolApprovalToggle,
  ChatToolAxis,
  ChatToolCatalogEntry,
  ChatToolRunner,
  ChatToolSettings,
  ChatToolToggle,
  ChatToolToggleGroup,
} from './chatToolTogglesTypes'

/**
 * Pure half of the chat settings Tools section, shared by web, desktop and
 * mobile. The clients each held their own copy of this logic and had already
 * drifted; worse, every copy built its row list from the chat's OWN stored
 * `availableTools ∪ autoCallTools`, so a tool the chat did not already carry
 * could never be switched on and every row rendered a blank description. The
 * rows here come from the backend catalogue instead — the same arrays the
 * runtime registers from — so the list cannot drift from what an agent gets.
 */

/**
 * A CLI chat's allowlist is UNSET when it is missing or empty, and unset means
 * "every built-in tool", never "no tools". The runner reads it the same way;
 * see `createCliToolNameFilter` in thefactory-tools.
 */
function isUnsetAllowlist(names: string[] | undefined): boolean {
  return !names || names.length === 0
}

/** Rows for the settings surface: the catalogue joined against the chat's own allowlist. */
export function buildChatToolToggles(
  catalog: readonly ChatToolCatalogEntry[],
  settings: ChatToolSettings | undefined,
  runner: ChatToolRunner,
): ChatToolToggle[] {
  if (runner === 'cli') {
    const allowlist = settings?.cliAvailableTools
    const unset = isUnsetAllowlist(allowlist)
    const allowed = new Set(allowlist ?? [])
    return catalog.map((entry) => ({
      name: entry.name,
      description: entry.description,
      category: entry.category,
      available: entry.alwaysOn || unset || allowed.has(entry.name),
      autoCall: false,
      toggleable: !entry.alwaysOn,
      supportsAutoCall: false,
    }))
  }
  const available = new Set(settings?.availableTools ?? [])
  const auto = new Set(settings?.autoCallTools ?? [])
  return catalog.map((entry) => ({
    name: entry.name,
    description: entry.description,
    category: entry.category,
    available: entry.alwaysOn || available.has(entry.name),
    autoCall: auto.has(entry.name),
    toggleable: !entry.alwaysOn,
    supportsAutoCall: true,
  }))
}

/**
 * The settings patch one switch produces. Returns only the changed allowlist
 * fields, so the caller can merge them onto the chat's completion settings.
 *
 * On the CLI transport the FIRST switch-off materialises the whole catalogue
 * minus that tool: an unset allowlist means "everything", so writing just the
 * one name would have granted one tool instead of removing one. The always-on
 * names are always written into the list too, which is what keeps a chat with
 * every tool switched off from collapsing back to the unset "everything"
 * reading.
 */
export function applyChatToolToggle(
  catalog: readonly ChatToolCatalogEntry[],
  settings: ChatToolSettings | undefined,
  runner: ChatToolRunner,
  toolName: string,
  axis: ChatToolAxis,
  next: boolean,
): ChatToolSettings {
  if (runner === 'cli') {
    if (axis === 'autoCall') return {}
    const entry = catalog.find((c) => c.name === toolName)
    if (entry?.alwaysOn) return {}
    const allowlist = settings?.cliAvailableTools
    const granted = isUnsetAllowlist(allowlist)
      ? new Set(catalog.map((c) => c.name))
      : new Set(allowlist)
    if (next) granted.add(toolName)
    else granted.delete(toolName)
    for (const c of catalog) if (c.alwaysOn) granted.add(c.name)
    return { cliAvailableTools: catalog.filter((c) => granted.has(c.name)).map((c) => c.name) }
  }

  const available = new Set(settings?.availableTools ?? [])
  const auto = new Set(settings?.autoCallTools ?? [])
  if (axis === 'available') {
    if (next) available.add(toolName)
    else {
      available.delete(toolName)
      // A tool that is not available must not stay auto-callable — otherwise
      // switching it back on silently restores an auto-call the user never
      // re-granted.
      auto.delete(toolName)
    }
  } else {
    if (!available.has(toolName)) return {}
    if (next) auto.add(toolName)
    else auto.delete(toolName)
  }
  return { availableTools: [...available], autoCallTools: [...auto] }
}

/**
 * Clear the chat's own allowlist so it falls back to the defaults. For a CLI
 * chat that is the empty list, which the runner reads as unset — and unset is
 * self-healing: a built-in added later is granted without the user touching
 * anything.
 */
export function resetChatToolToggles(runner: ChatToolRunner): ChatToolSettings {
  if (runner === 'cli') return { cliAvailableTools: [] }
  return {}
}

/** Rows whose name or description matches a free-text query. Empty query = everything. */
export function filterChatToolToggles(
  toggles: readonly ChatToolToggle[],
  query: string,
): ChatToolToggle[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...toggles]
  return toggles.filter(
    (t) =>
      t.name.toLowerCase().includes(needle) ||
      t.description.toLowerCase().includes(needle) ||
      t.category.toLowerCase().includes(needle),
  )
}

/**
 * Group rows by category, preserving first-seen order. The catalogue runs to
 * ~60-150 rows; a flat list of that length is unusable.
 */
export function groupChatToolToggles(toggles: readonly ChatToolToggle[]): ChatToolToggleGroup[] {
  const groups: ChatToolToggleGroup[] = []
  const byCategory = new Map<string, ChatToolToggleGroup>()
  for (const toggle of toggles) {
    let group = byCategory.get(toggle.category)
    if (!group) {
      group = { category: toggle.category, tools: [] }
      byCategory.set(toggle.category, group)
      groups.push(group)
    }
    group.tools.push(toggle)
  }
  return groups
}

/**
 * The chat-wide approval switch. ABSENT MEANS ASK: a chat that never chose —
 * and every chat written before the switch existed — keeps stopping for a human.
 *
 * Only the CLI transport has it. An API chat already decides per tool via
 * `autoCallTools`, and rendering both would be two switches for one idea.
 */
export function buildChatToolApprovalToggle(
  settings: ChatToolSettings | undefined,
  runner: ChatToolRunner,
): ChatToolApprovalToggle {
  if (runner !== 'cli') return { auto: false, supported: false }
  return { auto: settings?.toolApprovalMode === 'auto', supported: true }
}

/**
 * The settings patch the approval switch produces.
 *
 * It writes ONLY the mode. Nothing here touches `cliAvailableTools`, which is
 * what keeps auto-approval from re-enabling a tool the user switched off: a
 * tool outside the allowlist is never registered on the run's MCP server, so no
 * approval mode can make it callable.
 */
export function applyChatToolApprovalMode(runner: ChatToolRunner, auto: boolean): ChatToolSettings {
  if (runner !== 'cli') return {}
  return { toolApprovalMode: auto ? 'auto' : 'ask' }
}
