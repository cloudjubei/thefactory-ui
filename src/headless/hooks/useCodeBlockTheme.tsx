// Cross-platform code-block theme context. Apps wire their persisted
// `userPreferences.codeBlockTheme` setting in once at the root via
// `CodeBlockThemeProvider`; the shared `<Code>` compounds (web + native)
// read the resolved value via `useCodeBlockTheme()` and pick a matching
// palette. When no provider is present, `useCodeBlockTheme()` returns
// `'light'` so the default rendering matches the default app theme.

import { createContext, useContext, type ReactNode } from 'react'
import type { CodeBlockTheme } from '../types/settings'

const CodeBlockThemeContext = createContext<CodeBlockTheme>('light')

export function CodeBlockThemeProvider({
  value,
  children,
}: {
  value: CodeBlockTheme
  children: ReactNode
}) {
  return <CodeBlockThemeContext.Provider value={value}>{children}</CodeBlockThemeContext.Provider>
}

export function useCodeBlockTheme(): CodeBlockTheme {
  return useContext(CodeBlockThemeContext)
}
