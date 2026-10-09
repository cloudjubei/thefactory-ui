import type { ListActionRulesResponse } from '../api/generated'

/** One "always allow" rule as the backend lists it: the rule, its chat and its sign-in named. */
export type ActionRuleView = ListActionRulesResponse['rules'][number]

/** How one rule reads in a list — see `actionRuleRowView`. */
export type ActionRuleRowView = {
  id: string
  title: string
  /** An exact-call rule's arguments, in one line. */
  callSummary?: string
  where: string
  signIn?: string
  made: string
  lastUsed: string
}

/** One chat's rules in the settings listing. */
export type ActionRuleChatGroup = { chatContextId: string; title: string; rules: ActionRuleView[] }

/** One project's chats in the settings listing; `projectId` is absent for chats of no project. */
export type ActionRuleProjectGroup = {
  projectId?: string
  title: string
  chats: ActionRuleChatGroup[]
}

/** The settings listing: everywhere rules first, then chat rules by project and chat. */
export type GroupedActionRules = {
  everywhere: ActionRuleView[]
  projects: ActionRuleProjectGroup[]
}

/** What the settings listing can be narrowed by. */
export type ActionRuleFilterOptions = {
  projects: { value: string; label: string }[]
  signIns: { value: string; label: string }[]
}
