import type { ReactNode } from 'react'
import { LLMConfigsProvider as HeadlessLLMConfigsProvider } from '../../../headless'
import { localStorageAdapter } from '../storage/localStorageAdapter'

/**
 * Connected `LLMConfigsProvider` for browser clients (web + Electron
 * renderer): feeds the `localStorage`-backed adapter into the headless
 * provider so its active / recents persistence works. Read state via
 * `useLLMConfigs` from `thefactory-ui/headless`.
 */
export function LLMConfigsProviderConnected({ children }: { children: ReactNode }) {
  return (
    <HeadlessLLMConfigsProvider storage={localStorageAdapter}>
      {children}
    </HeadlessLLMConfigsProvider>
  )
}
