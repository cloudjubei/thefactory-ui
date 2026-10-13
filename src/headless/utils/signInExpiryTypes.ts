import type { ProcessRun } from 'thefactory-tools/types'

/** A stored CLI login as the app holds it: its CLI and, once checked, whether it is still signed in. */
export type CliLogin = {
  id: string
  cli: string
  authStatus?: { authenticated: boolean }
}

/** The login each CLI uses when work names none of its own. */
export type ActiveCliLogin = {
  activeCli: string | null
  activeCliCredentialId: string | null
}

/** Every stored login, and which one is active. */
export type SignInLogins = {
  logins: readonly CliLogin[]
  active: ActiveCliLogin
}

/** The CLI a piece of agent work runs on, and the login it is bound to, if any. */
export type AgentLogin = {
  cli: string
  credentialId?: string
}

/** A chat's CLI binding, as far as its sign-in goes. */
export type SignInChatRunner = {
  tool: string
  credentialId?: string
  apiKeyCredentialId?: string
}

/** A chat as a scope's sign-in reads it: where it is, what it runs on, and whether an agent replies or an ask waits in it. */
export type SignInChat = {
  projectId?: string
  groupId?: string
  cliRunner?: SignInChatRunner | null
  isThinking: boolean
  pendingAsks?: number
}

/** A process run as a scope's sign-in reads it. */
export type SignInRun = Pick<ProcessRun, 'projectId' | 'status'> &
  Partial<Pick<ProcessRun, 'parentRunId' | 'input' | 'modelOverride'>>

/** The expired logins a project's live chats and its current runs use, by name. */
export type ScopeSignIns = {
  chats: readonly string[]
  runs: readonly string[]
}

/** Expired logins by the scope whose live agent work uses them. */
export type ExpiredSignIns = {
  byProject: ReadonlyMap<string, ScopeSignIns>
  /** A group's own chats. */
  byGroup: ReadonlyMap<string, readonly string[]>
}
