/** WS topic announcing that a ticket connection was created, updated or deleted — by anyone, an agent's form included. */
export const PROVIDER_CONNECTIONS_EVENT = 'providerConnections:updated'

/** WS topic announcing that an LLM config was created, updated or deleted. */
export const LLM_CONFIGS_EVENT = 'llmConfigs:updated'

/** WS topic announcing that a web-search key was set or removed. */
export const WEB_SEARCH_KEYS_EVENT = 'webSearchKeys:updated'

/** WS topic announcing that the agent-run choice — the runner or its API config — changed, on any device or by an agent. */
export const AGENT_RUNNER_EVENT = 'agentRunner:updated'
