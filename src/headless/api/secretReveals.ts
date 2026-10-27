import { revealGitCredentialToken, revealLlmConfigKey, revealWebSearchKey } from './generated'

/** The stored key of one LLM config, for the person who asked to see it. */
export async function revealStoredLlmKey(id: string): Promise<string> {
  return (await revealLlmConfigKey({ path: { id }, throwOnError: true })).data.value
}

/** The stored token of one Git credential, for the person who asked to see it. */
export async function revealStoredGitToken(id: string): Promise<string> {
  return (await revealGitCredentialToken({ path: { id }, throwOnError: true })).data.value
}

/** The stored key of one web-search provider, for the person who asked to see it. */
export async function revealStoredWebSearchKey(provider: string): Promise<string> {
  return (await revealWebSearchKey({ path: { provider }, throwOnError: true })).data.value
}
