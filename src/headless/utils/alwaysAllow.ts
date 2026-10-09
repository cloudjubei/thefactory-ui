import type { PermanentGrantScope } from '../api/generated'
import {
  ALWAYS_ALLOW_EVERYWHERE_LABEL,
  ALWAYS_ALLOW_EVERYWHERE_REACH,
  ALWAYS_ALLOW_IN_CHAT_LABEL,
  ALWAYS_ALLOWED_EVERYWHERE_LABEL,
  ALWAYS_ALLOWED_IN_CHAT_LABEL,
  GRANT_SCOPE_WORDS,
} from './alwaysAllowConstants'
import type {
  AlwaysAllowChoiceView,
  AlwaysAllowScope,
  GrantCovers,
  PendingToolGrantDecision,
} from './chatTypes'
import {
  GRANT_RULE_EXACT_CALL,
  GRANT_RULE_UNNAMED,
  GRANT_RULE_WHOLE_TOOL,
} from './cliRunnerConstants'

/** Where a CLI ask may be always allowed: its own chat first when it has one, never when it refuses standing grants. */
export function cliAlwaysAllowScopes(action: {
  noPermanentGrant?: boolean
  chatContextId?: string
}): AlwaysAllowScope[] {
  if (action.noPermanentGrant === true) return []
  return action.chatContextId ? ['chat', 'everywhere'] : ['everywhere']
}

/** What an always-allow covers: the whole tool when the grant names only it, else the one exact call. */
export function grantCoversOf(grantPayload: unknown): GrantCovers {
  const keys =
    typeof grantPayload === 'object' && grantPayload !== null ? Object.keys(grantPayload) : []
  return keys.length === 1 && keys[0] === 'tool' ? 'tool' : 'exact-call'
}

/** The decision that always allows an ask in `scope`. */
export function alwaysAllowDecision(scope: AlwaysAllowScope): PendingToolGrantDecision {
  return scope === 'chat' ? 'always-in-chat' : 'always-everywhere'
}

/** Where a decision always allows its ask, or `undefined` for one that is not an always-allow. */
export function alwaysAllowScopeOf(
  decision: PendingToolGrantDecision,
): AlwaysAllowScope | undefined {
  if (decision === 'always-in-chat') return 'chat'
  if (decision === 'always-everywhere') return 'everywhere'
  return undefined
}

/** The grant scope a decision sends for an ask raised in `chatContextId`. */
export function decisionGrantScope(
  decision: PendingToolGrantDecision,
  chatContextId: string | undefined,
): PermanentGrantScope | undefined {
  const scope = alwaysAllowScopeOf(decision)
  if (scope === 'everywhere') return { kind: 'everywhere' }
  if (scope === undefined) return undefined
  if (!chatContextId)
    throw new Error(
      'This ask was raised outside any chat — it can only be always allowed everywhere.',
    )
  return { kind: 'chat', chatContextId }
}

/** What a standing grant allows, in words. A grant recorded before scopes existed applied everywhere. */
export function grantRuleText(
  toolName: string | undefined,
  grantPayload: unknown,
  grantScope: PermanentGrantScope | undefined,
): string {
  const where = GRANT_SCOPE_WORDS[grantScope?.kind === 'chat' ? 'chat' : 'everywhere']
  if (toolName === undefined) return GRANT_RULE_UNNAMED(where)
  return grantCoversOf(grantPayload) === 'tool'
    ? GRANT_RULE_WHOLE_TOOL(toolName, where)
    : GRANT_RULE_EXACT_CALL(toolName, where)
}

/**
 * The always-allow control for one ask: the default a single click gives (its
 * own chat when it has one), the places a menu offers, and what each allows.
 * A row `marked` for Resume shows that choice, and a click takes it back.
 */
export function alwaysAllowChoiceView(input: {
  scopes: readonly AlwaysAllowScope[]
  toolName: string
  covers: GrantCovers
  marked?: AlwaysAllowScope
}): AlwaysAllowChoiceView {
  const { scopes, toolName, covers, marked } = input
  const fallback: AlwaysAllowScope = scopes.includes('chat') ? 'chat' : 'everywhere'
  return {
    primary: marked
      ? { scope: undefined, label: markedLabel(marked) }
      : { scope: fallback, label: chooseLabel(fallback) },
    marked: marked !== undefined,
    options:
      scopes.length > 1
        ? scopes.map((scope) => ({
            scope,
            label: chooseLabel(scope),
            description: optionDescription(scope, toolName, covers),
            selected: marked === scope,
          }))
        : [],
    title: marked
      ? `Resume will allow ${subject(toolName, covers)} from now on ${reach(marked)} — click to undo`
      : `Allow ${subject(toolName, covers)} now and ${laterCalls(covers)} ${reach(fallback)}`,
  }
}

function chooseLabel(scope: AlwaysAllowScope): string {
  return scope === 'chat' ? ALWAYS_ALLOW_IN_CHAT_LABEL : ALWAYS_ALLOW_EVERYWHERE_LABEL
}

function markedLabel(scope: AlwaysAllowScope): string {
  return scope === 'chat' ? ALWAYS_ALLOWED_IN_CHAT_LABEL : ALWAYS_ALLOWED_EVERYWHERE_LABEL
}

function reach(scope: AlwaysAllowScope): string {
  return scope === 'chat' ? GRANT_SCOPE_WORDS.chat : `in ${ALWAYS_ALLOW_EVERYWHERE_REACH}`
}

function subject(toolName: string, covers: GrantCovers): string {
  return covers === 'tool' ? toolName : `this exact ${toolName} call`
}

function laterCalls(covers: GrantCovers): string {
  return covers === 'tool' ? 'every later call of it' : 'whenever it repeats'
}

function optionDescription(scope: AlwaysAllowScope, toolName: string, covers: GrantCovers): string {
  if (scope === 'chat') {
    return covers === 'tool'
      ? `Every later ${toolName} call in this chat`
      : `This exact ${toolName} call, whenever it repeats in this chat`
  }
  const everywhere = capitalise(ALWAYS_ALLOW_EVERYWHERE_REACH)
  return covers === 'tool' ? everywhere : `This exact call, in ${ALWAYS_ALLOW_EVERYWHERE_REACH}`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
