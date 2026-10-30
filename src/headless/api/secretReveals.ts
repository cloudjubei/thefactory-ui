import { revealGitCredentialToken, revealLlmConfigKey, revealWebSearchKey } from './generated'
import type { StoredSecretKind, StoredSecretReveal } from '../utils/storedSecretViewTypes'

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

/**
 * A stored secret an agent showed the person, fetched once they asked to see
 * it — or word that it is no longer stored. Any other failure throws.
 */
export async function revealStoredSecret(
  kind: StoredSecretKind,
  id: string,
): Promise<StoredSecretReveal> {
  const out =
    kind === 'llm-key'
      ? await revealLlmConfigKey({ path: { id } })
      : kind === 'git-token'
        ? await revealGitCredentialToken({ path: { id } })
        : await revealWebSearchKey({ path: { provider: id } })
  if (out.data) return { value: out.data.value }
  if (out.response?.status === 404) return { missing: true }
  throw new Error(
    `The stored secret could not be fetched (${out.response?.status ?? 'no answer'}).`,
  )
}
