/** Which transport a chat's tools are offered on. */
export type ChatToolRunner = 'api' | 'cli'

/** Which of a tool's two switches a toggle acts on. */
export type ChatToolAxis = 'available' | 'autoCall'

/** One catalogue row as the backend's `/tools/chat-catalog` serves it. */
export interface ChatToolCatalogEntry {
  /** The tool name exactly as the agent calls it. */
  name: string
  description: string
  category: string
  /** True when the tool cannot be switched off (asking a human, landing work). */
  alwaysOn: boolean
}

/**
 * The tool-allowlist half of a chat's completion settings.
 *
 * A type alias rather than an interface on purpose: consumers spread this into
 * a settings patch typed `Record<string, unknown>`, and an interface has no
 * implicit index signature, so it cannot be assigned there.
 */
export type ChatToolSettings = {
  availableTools?: string[]
  autoCallTools?: string[]
  cliAvailableTools?: string[]
  toolApprovalMode?: 'ask' | 'auto'
}

/**
 * The chat-wide "run tools without asking" switch, as the settings surface
 * renders it. Distinct from the per-tool rows: this decides whether the agent
 * STOPS for a human, not which tools it has at all.
 */
export interface ChatToolApprovalToggle {
  /** True when the chat runs permitted tools without asking. */
  auto: boolean
  /** False on a transport that expresses approval per tool instead of per chat. */
  supported: boolean
}

/** One rendered row of the chat settings Tools section. */
export interface ChatToolToggle {
  name: string
  description: string
  category: string
  available: boolean
  autoCall: boolean
  /** False for a tool this transport never lets the user switch off. */
  toggleable: boolean
  /** False on the CLI transport, which has no per-tool auto-call axis yet. */
  supportsAutoCall: boolean
}

/** A category header plus the rows under it. */
export interface ChatToolToggleGroup {
  category: string
  tools: ChatToolToggle[]
}
