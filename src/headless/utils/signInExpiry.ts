import { AUTH_CREDENTIAL_ID_HOST_PATH_PREFIX } from 'thefactory-tools/constants'

import { cliLabel } from './cliRunner'
import type { CredentialCapture } from './credentialCaptureTypes'
import type { NavRowIndicator } from './navIndicatorTypes'
import {
  SIGN_IN_CARD_PROVIDER,
  SIGN_IN_EXPIRED_SUFFIX,
  SIGN_IN_LIVE_RUN_STATUSES,
  SIGN_IN_NAMES,
  SIGN_INS_EXPIRED_SUFFIX,
} from './signInExpiryConstants'
import type {
  AgentLogin,
  CliLogin,
  ExpiredSignIns,
  ScopeSignIns,
  SignInChat,
  SignInChatRunner,
  SignInLogins,
  SignInRun,
} from './signInExpiryTypes'

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function agentLogin(cli: unknown, credentialId: unknown, apiKey: unknown): AgentLogin | undefined {
  const tool = text(cli)
  if (!tool || text(apiKey)) return undefined
  const id = text(credentialId)
  return id ? { cli: tool, credentialId: id } : { cli: tool }
}

/** The account a CLI signs in to, as a person calls it. Pure. */
export function signInName(cli: string): string {
  return SIGN_IN_NAMES[cli] ?? cliLabel(cli)
}

/** "Claude sign-in expired". Pure. */
export function signInExpiredTitle(name: string): string {
  return `${name} ${SIGN_IN_EXPIRED_SUFFIX}`
}

/** "Claude sign-in expired", "Claude and Codex sign-ins expired". Pure. */
export function signInsExpiredTitle(names: readonly string[]): string {
  if (names.length < 2) return signInExpiredTitle(names[0] ?? '')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} ${SIGN_INS_EXPIRED_SUFFIX}`
}

function isHostLogin(id: string): boolean {
  return id.startsWith(AUTH_CREDENTIAL_ID_HOST_PATH_PREFIX)
}

/**
 * The name of every stored login checked and found signed out, once each,
 * whatever uses it — never one not checked yet, nor one read off the host.
 * Pure.
 */
export function storedSignInsExpired(logins: readonly CliLogin[]): string[] {
  const names = new Set<string>()
  for (const login of logins) {
    if (isHostLogin(login.id) || login.authStatus?.authenticated !== false) continue
    names.add(signInName(login.cli))
  }
  return [...names]
}

/**
 * The Settings nav item: red, one for each expired sign-in, so a login that
 * expired shows even with nothing using it; nothing otherwise. Pure.
 */
export function settingsNavIndicator(expired: readonly string[]): NavRowIndicator {
  if (expired.length === 0) return { kind: 'none' }
  return {
    kind: 'ink',
    badge: { parts: [{ channel: 'failed', count: expired.length }], rollup: false },
    title: signInsExpiredTitle(expired),
  }
}

/**
 * The stored login each chat's open sign-in cards sign in again, by chat key.
 * A card for a new login, an answered one, or one outside a chat waits on no
 * stored login. Pure.
 */
export function signInCardsByChat(
  captures: readonly CredentialCapture[],
): ReadonlyMap<string, AgentLogin[]> {
  const out = new Map<string, AgentLogin[]>()
  for (const capture of captures) {
    if (capture.status !== 'requested' || capture.provider !== SIGN_IN_CARD_PROVIDER) continue
    const { chatContextKey, preset, replacesId } = capture
    if (!chatContextKey || !preset || !replacesId) continue
    out.set(chatContextKey, [
      ...(out.get(chatContextKey) ?? []),
      { cli: preset, credentialId: replacesId },
    ])
  }
  return out
}

/** What a chat signs in with: its CLI and bound login; nothing on the API or an API key. Pure. */
export function chatAgentLogin(
  cliRunner: SignInChatRunner | null | undefined,
): AgentLogin | undefined {
  if (!cliRunner) return undefined
  return agentLogin(cliRunner.tool, cliRunner.credentialId, cliRunner.apiKeyCredentialId)
}

/**
 * What a process run's agents sign in with from now on: the model a person
 * chose for it, else what its launch asked for; nothing on the API or an API
 * key. Pure.
 */
export function processRunAgentLogin(
  run: Partial<Pick<SignInRun, 'input' | 'modelOverride'>>,
): AgentLogin | undefined {
  const override = run.modelOverride
  if (override) {
    return override.runner === 'cli'
      ? agentLogin(override.cli, override.authCredentialId, override.apiKeyCredentialId)
      : undefined
  }
  const input = run.input
  if (!input || input.runner !== 'cli') return undefined
  const cliRunner = input.cliRunner
  if (!cliRunner || typeof cliRunner !== 'object') return undefined
  const { cli, authCredentialId, apiKeyCredentialId } = cliRunner as Record<string, unknown>
  return agentLogin(cli, authCredentialId, apiKeyCredentialId)
}

/**
 * The stored login work signs in with, as the host picks it: the one it is
 * bound to while that is the CLI's, else the CLI's active login, else its
 * first. A login read off the host is never stored, so nothing is known of
 * it. Pure.
 */
export function cliLoginOf(login: AgentLogin, signIns: SignInLogins): CliLogin | undefined {
  const { logins, active } = signIns
  const bound = login.credentialId
  if (bound && isHostLogin(bound)) return undefined
  const own = bound ? logins.find((l) => l.id === bound && l.cli === login.cli) : undefined
  if (own) return own
  const activeId = active.activeCli === login.cli ? active.activeCliCredentialId : null
  const activeLogin = activeId ? logins.find((l) => l.id === activeId) : undefined
  return activeLogin ?? logins.find((l) => l.cli === login.cli)
}

/**
 * The name of each expired login the work signs in with, once each. Only a
 * login checked and found signed out counts — never one not checked yet. Pure.
 */
export function expiredSignInNames(
  work: readonly (AgentLogin | undefined)[],
  signIns: SignInLogins,
): string[] {
  const names = new Set<string>()
  for (const login of work) {
    if (!login) continue
    const stored = cliLoginOf(login, signIns)
    if (stored?.authStatus?.authenticated === false) names.add(signInName(stored.cli))
  }
  return [...names]
}

/**
 * Every expired login a project's chats and runs use, once each — leaving out
 * a channel whose badge is turned off. Pure.
 */
export function scopeSignInNames(
  scope: ScopeSignIns | undefined,
  enabled: { chat?: boolean; processes?: boolean } = {},
): string[] {
  if (!scope) return []
  const chats = enabled.chat === false ? [] : scope.chats
  const runs = enabled.processes === false ? [] : scope.runs
  return [...new Set([...chats, ...runs])]
}

function isLiveChat(chat: SignInChat): boolean {
  return chat.isThinking || (chat.pendingAsks ?? 0) > 0
}

function isLiveRun(run: SignInRun): boolean {
  return !run.parentRunId && SIGN_IN_LIVE_RUN_STATUSES.has(run.status)
}

function push<K>(map: Map<K, AgentLogin[]>, key: K, logins: readonly AgentLogin[]): void {
  if (logins.length === 0) return
  map.set(key, [...(map.get(key) ?? []), ...logins])
}

function chatLogins(chat: SignInChat): AgentLogin[] {
  const working = isLiveChat(chat) ? chatAgentLogin(chat.cliRunner) : undefined
  return [...(working ? [working] : []), ...(chat.signInCards ?? [])]
}

/**
 * The expired logins each scope's live agent work signs in with: a chat whose
 * agent replies or whose ask waits, a chat waiting on a sign-in card, and a
 * root run still working or waiting on the person. Each login is named once per
 * scope, so a chat whose card waits on it and the work that uses it count as one.
 * A project's chats and runs are kept apart so its Chat and Processes tabs each
 * say their own — a process run's chat counts with its runs; a group's are its
 * own chats. Pure.
 */
export function expiredSignInsByScope(input: {
  chats: readonly SignInChat[]
  runs: readonly SignInRun[]
  signIns: SignInLogins
}): ExpiredSignIns {
  const projectChats = new Map<string, AgentLogin[]>()
  const projectRuns = new Map<string, AgentLogin[]>()
  const groupChats = new Map<string, AgentLogin[]>()
  for (const chat of input.chats) {
    const logins = chatLogins(chat)
    const own = chat.channel === 'processes' ? projectRuns : projectChats
    if (chat.projectId) push(own, chat.projectId, logins)
    if (chat.groupId) push(groupChats, chat.groupId, logins)
  }
  for (const run of input.runs) {
    const login = isLiveRun(run) ? processRunAgentLogin(run) : undefined
    if (login) push(projectRuns, run.projectId, [login])
  }
  const byProject = new Map<string, ScopeSignIns>()
  for (const projectId of new Set([...projectChats.keys(), ...projectRuns.keys()])) {
    const scope = {
      chats: expiredSignInNames(projectChats.get(projectId) ?? [], input.signIns),
      runs: expiredSignInNames(projectRuns.get(projectId) ?? [], input.signIns),
    }
    if (scope.chats.length > 0 || scope.runs.length > 0) byProject.set(projectId, scope)
  }
  const byGroup = new Map<string, readonly string[]>()
  for (const [groupId, logins] of groupChats) {
    const names = expiredSignInNames(logins, input.signIns)
    if (names.length > 0) byGroup.set(groupId, names)
  }
  return { byProject, byGroup }
}
