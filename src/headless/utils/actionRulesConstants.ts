/** Where an everywhere rule applies. */
export const RULE_WHERE_EVERYWHERE = 'Everywhere — every chat, with any model or sign-in'

/** Where a rule shown inside its own chat applies. */
export const RULE_WHERE_THIS_CHAT = 'In this chat'

/** A chat with no rules of its own. */
export const CHAT_RULES_EMPTY =
  'No rules for this chat yet. Choosing "Always allow in this chat" on a tool call adds one.'

/** Settings with no rules at all. */
export const SAVED_RULES_EMPTY =
  'No saved rules. Choosing "Always allow" on a tool call saves one here.'

/** The group of chats that belong to no project. */
export const RULES_OTHER_CHATS_TITLE = 'Other chats'

/** A rule whose sign-in was removed. */
export const RULE_SIGN_IN_REMOVED = 'a sign-in that was removed'

/** The sign-in a rule was given on — a record only: every rule applies to every sign-in. */
export const RULE_GIVEN_ON = (signIn: string): string => `Given on ${signIn}`

/** The rules filter by the sign-in each was given on. */
export const RULES_GIVEN_ON_FILTER_LABEL = 'Given on'

/** Longest a single argument value reads before it is cut. */
export const RULE_ARG_VALUE_MAX = 40

/** Longest a whole call summary reads before it is cut. */
export const RULE_CALL_SUMMARY_MAX = 140
