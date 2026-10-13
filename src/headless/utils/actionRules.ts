import { getChatContext } from 'thefactory-tools/utils'
import {
  RULE_ARG_VALUE_MAX,
  RULE_CALL_SUMMARY_MAX,
  RULE_GIVEN_ON,
  RULE_SIGN_IN_REMOVED,
  RULE_WHERE_EVERYWHERE,
  RULE_WHERE_THIS_CHAT,
  RULES_OTHER_CHATS_TITLE,
  TRUSTED_SITE_RULE_TITLE,
} from './actionRulesConstants'
import type {
  ActionRuleFilterOptions,
  ActionRuleProjectGroup,
  ActionRuleRowView,
  ActionRuleView,
  GroupedActionRules,
} from './actionRulesTypes'
import { formatChatTitle } from './chatTitle'
import { formatActionLabel } from './pendingToolGrants'
import { formatDateShort, timeAgo } from './time'

type ProjectTitle = (projectId: string) => string | undefined

const DAY_MS = 24 * 3600_000

/** What a rule allows, in words: a trusted site, the whole tool, one exact call, or one request of a kind. */
export function actionRuleTitle(
  rule: Pick<ActionRuleView, 'toolName' | 'covers' | 'kind' | 'site'>,
): string {
  if (rule.covers === 'site' && rule.site) return TRUSTED_SITE_RULE_TITLE(rule.site)
  if (!rule.toolName) return `Always allow this ${formatActionLabel(rule.kind)} request`
  return rule.covers === 'tool'
    ? `Always allow ${rule.toolName}`
    : `Always allow this exact ${rule.toolName} call`
}

/** An exact call's arguments in one line — `name: value · …`, long values and lines cut. */
export function actionRuleCallSummary(args: unknown): string | undefined {
  if (args === undefined) return undefined
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return cut(valueText(args, RULE_CALL_SUMMARY_MAX), RULE_CALL_SUMMARY_MAX)
  }
  const entries = Object.entries(args as Record<string, unknown>)
  if (entries.length === 0) return 'no arguments'
  const line = entries.map(([key, value]) => `${key}: ${valueText(value, RULE_ARG_VALUE_MAX)}`)
  return cut(line.join(' · '), RULE_CALL_SUMMARY_MAX)
}

/** How a rule reads in a list. `inChat`: shown inside the chat it is scoped to. */
export function actionRuleRowView(
  rule: ActionRuleView,
  opts: { now: number; inChat?: boolean; projectTitle?: ProjectTitle },
): ActionRuleRowView {
  const callSummary = rule.covers === 'exact-call' ? actionRuleCallSummary(rule.args) : undefined
  const signIn = rule.credentialId
    ? RULE_GIVEN_ON(rule.credentialLabel ?? RULE_SIGN_IN_REMOVED)
    : undefined
  return {
    id: rule.id,
    title: actionRuleTitle(rule),
    ...(callSummary !== undefined ? { callSummary } : {}),
    where: whereText(rule, opts),
    ...(signIn !== undefined ? { signIn } : {}),
    made: `Made ${formatDateShort(new Date(rule.createdAt))}`,
    lastUsed: lastUsedText(rule.lastUsedAt, opts.now),
  }
}

/** The rules scoped to one chat — what that chat's own settings list. */
export function chatActionRules(
  rules: readonly ActionRuleView[],
  chatContextId: string,
): ActionRuleView[] {
  return rules.filter(
    (rule) => rule.scope.kind === 'chat' && rule.scope.chatContextId === chatContextId,
  )
}

/**
 * The settings listing: everywhere rules first, then chat rules grouped by
 * project (by title; chats of no project last) and by chat (by title).
 * Narrowed to a project, everywhere rules — which belong to none — leave.
 */
export function groupActionRules(
  rules: readonly ActionRuleView[],
  opts: { projectTitle: ProjectTitle; projectId?: string; credentialId?: string },
): GroupedActionRules {
  const shown = rules.filter(
    (rule) => opts.credentialId === undefined || rule.credentialId === opts.credentialId,
  )
  const everywhere =
    opts.projectId === undefined ? shown.filter((rule) => rule.scope.kind === 'everywhere') : []
  const byProject = new Map<string, ActionRuleProjectGroup>()
  for (const rule of shown) {
    if (rule.scope.kind !== 'chat') continue
    const projectId = rule.chat?.projectId
    if (opts.projectId !== undefined && projectId !== opts.projectId) continue
    const projectKey = projectId ?? ''
    const project = byProject.get(projectKey) ?? {
      ...(projectId ? { projectId } : {}),
      title: projectId ? (opts.projectTitle(projectId) ?? projectId) : RULES_OTHER_CHATS_TITLE,
      chats: [],
    }
    byProject.set(projectKey, project)
    const chatContextId = rule.scope.chatContextId
    const chat = project.chats.find((c) => c.chatContextId === chatContextId)
    if (chat) chat.rules.push(rule)
    else
      project.chats.push({
        chatContextId,
        title: chatTitleOf(rule, opts.projectTitle),
        rules: [rule],
      })
  }
  const projects = [...byProject.values()]
    .map((project) => ({ ...project, chats: sortByTitle(project.chats) }))
    .sort((a, b) =>
      !a.projectId !== !b.projectId ? (a.projectId ? -1 : 1) : a.title.localeCompare(b.title),
    )
  return { everywhere, projects }
}

/** The projects and sign-ins the rules have — what the settings listing can be narrowed by. */
export function actionRuleFilterOptions(
  rules: readonly ActionRuleView[],
  opts: { projectTitle: ProjectTitle },
): ActionRuleFilterOptions {
  const projects = new Map<string, string>()
  const signIns = new Map<string, string>()
  for (const rule of rules) {
    const projectId = rule.chat?.projectId
    if (projectId) projects.set(projectId, opts.projectTitle(projectId) ?? projectId)
    if (rule.credentialId) {
      signIns.set(rule.credentialId, rule.credentialLabel ?? RULE_SIGN_IN_REMOVED)
    }
  }
  const options = (entries: Map<string, string>) =>
    sortByLabel([...entries].map(([value, label]) => ({ value, label })))
  return { projects: options(projects), signIns: options(signIns) }
}

/** What removing a rule asks before it goes. */
export function removeActionRuleConfirm(rule: ActionRuleView): string {
  return `Remove “${actionRuleTitle(rule)}”? Its calls will ask you again.`
}

/** A chat rule's chat, by its title, or by its kind when it has none. */
export function chatTitleOf(rule: ActionRuleView, projectTitle?: ProjectTitle): string {
  if (rule.chat?.title) return rule.chat.title
  const chatContextId = rule.scope.kind === 'chat' ? rule.scope.chatContextId : ''
  const context = getChatContext(chatContextId)
  if (!context) return chatContextId
  const projectId = 'projectId' in context ? context.projectId : undefined
  const projectName = projectId ? projectTitle?.(projectId) : undefined
  return formatChatTitle({ context, ...(projectName ? { projectName } : {}) })
}

function whereText(
  rule: ActionRuleView,
  opts: { inChat?: boolean; projectTitle?: ProjectTitle },
): string {
  if (rule.scope.kind === 'everywhere') return RULE_WHERE_EVERYWHERE
  if (opts.inChat) return RULE_WHERE_THIS_CHAT
  return `In “${chatTitleOf(rule, opts.projectTitle)}”`
}

function lastUsedText(lastUsedAt: number | undefined, now: number): string {
  if (lastUsedAt === undefined) return 'Not used yet'
  return now - lastUsedAt < DAY_MS
    ? `Last used ${timeAgo(now, lastUsedAt)}`
    : `Last used ${formatDateShort(new Date(lastUsedAt))}`
}

function valueText(value: unknown, max: number): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `[${value.length} ${value.length === 1 ? 'item' : 'items'}]`
  if (typeof value === 'object') return `{${Object.keys(value as object).join(', ')}}`
  return cut(String(value), max)
}

function cut(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function sortByTitle<T extends { title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.title.localeCompare(b.title))
}

function sortByLabel<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label))
}
