import { isRunChat } from 'thefactory-tools/utils'

import type {
  ChatToolApprovalToggle,
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
 * tool lists, so a tool the chat did not already carry
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

/**
 * The list a CLI row's switch is: the chat's own `availableTools` for a tool
 * every model is offered — one switch whichever model runs the chat — and
 * `cliAvailableTools` for a CLI-only one.
 */
function cliListOf(entry: ChatToolCatalogEntry): 'availableTools' | 'cliAvailableTools' {
  return entry.everyRunner ? 'availableTools' : 'cliAvailableTools'
}

/** Rows for the settings surface: the catalogue joined against the chat's own allowlist. */
export function buildChatToolToggles(
  catalog: readonly ChatToolCatalogEntry[],
  settings: ChatToolSettings | undefined,
  runner: ChatToolRunner,
): ChatToolToggle[] {
  if (runner === 'cli') {
    return catalog.map((entry) => {
      const list = settings?.[cliListOf(entry)]
      return {
        name: entry.name,
        description: entry.description,
        category: entry.category,
        available: entry.alwaysOn || isUnsetAllowlist(list) || (list ?? []).includes(entry.name),
        toggleable: !entry.alwaysOn,
      }
    })
  }
  const available = new Set(settings?.availableTools ?? [])
  return catalog.map((entry) => ({
    name: entry.name,
    description: entry.description,
    category: entry.category,
    available: entry.alwaysOn || available.has(entry.name),
    toggleable: !entry.alwaysOn,
  }))
}

/**
 * The settings patch one switch produces. Returns only the changed allowlist
 * fields, so the caller can merge them onto the chat's completion settings.
 *
 * On the CLI transport a tool every model is offered switches in the chat's
 * own `availableTools` — the list an API turn reads — and a CLI-only one in
 * `cliAvailableTools`. The FIRST switch-off of an unset list materialises the
 * tools it governs minus that one: an unset list means "everything", so
 * writing just the one name would have granted one tool instead of removing
 * one. The always-on names are always written into the CLI list too, which is
 * what keeps a chat with every tool switched off from collapsing back to the
 * unset "everything" reading.
 */
export function applyChatToolToggle(
  catalog: readonly ChatToolCatalogEntry[],
  settings: ChatToolSettings | undefined,
  runner: ChatToolRunner,
  toolName: string,
  next: boolean,
): ChatToolSettings {
  if (runner === 'cli') {
    const entry = catalog.find((c) => c.name === toolName)
    if (!entry || entry.alwaysOn) return {}
    const key = cliListOf(entry)
    const governed = catalog.filter((c) => c.alwaysOn || cliListOf(c) === key)
    const list = settings?.[key]
    const granted = new Set(isUnsetAllowlist(list) ? governed.map((c) => c.name) : list)
    if (next) granted.add(toolName)
    else granted.delete(toolName)
    if (key === 'availableTools') {
      return {
        availableTools: [...granted].filter(
          (name) => !catalog.find((c) => c.name === name)?.alwaysOn,
        ),
      }
    }
    for (const c of catalog) if (c.alwaysOn) granted.add(c.name)
    return { cliAvailableTools: governed.filter((c) => granted.has(c.name)).map((c) => c.name) }
  }

  const available = new Set(settings?.availableTools ?? [])
  if (next) available.add(toolName)
  else available.delete(toolName)
  return { availableTools: [...available] }
}

/**
 * The settings patch "Reset to defaults" produces — the same whichever model
 * runs the chat: the chat type's tools on both transports and its approval
 * switch. A CLI allowlist the type leaves unset comes back as the empty list,
 * which the runner reads as unset — self-healing: a built-in added later is
 * granted without the user touching anything. An absent switch is written as
 * asking, which is what absent means.
 */
export function resetChatToolToggles(typeSettings: ChatToolSettings | undefined): ChatToolSettings {
  return {
    availableTools: [...(typeSettings?.availableTools ?? [])],
    cliAvailableTools: [...(typeSettings?.cliAvailableTools ?? [])],
    toolApprovalMode: typeSettings?.toolApprovalMode ?? 'ask',
  }
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
 * The chat's one approval switch — the same on every transport and agent, so
 * an API chat and a CLI chat ask about exactly the same calls. ABSENT MEANS
 * ASK: a chat that never chose — and every chat written before the switch
 * existed — keeps stopping for a human.
 */
export function buildChatToolApprovalToggle(
  settings: ChatToolSettings | undefined,
): ChatToolApprovalToggle {
  return { auto: settings?.toolApprovalMode === 'auto' }
}

/**
 * The settings patch the approval switch produces.
 *
 * It writes ONLY the mode. Nothing here touches the tool allowlist, which is
 * what keeps auto-approval from re-enabling a tool the user switched off: a
 * tool that is not offered can never be called, whatever the mode.
 */
export function applyChatToolApprovalMode(auto: boolean): ChatToolSettings {
  return { toolApprovalMode: auto ? 'auto' : 'ask' }
}

/**
 * Whether a chat offers "Finish turn on errors": only a person's own chat on
 * an API model, where the person is there to read the failure and answer. A CLI
 * agent and a run's agents always read a failed tool's answer and go on.
 */
export function chatOffersFinishTurnOnErrors(
  context: Parameters<typeof isRunChat>[0],
  runner: ChatToolRunner,
): boolean {
  return runner === 'api' && !isRunChat(context)
}
