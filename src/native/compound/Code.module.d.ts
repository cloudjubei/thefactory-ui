// Ambient declarations for `react-native-syntax-highlighter` + the Prism
// style ESM modules pulled from `react-syntax-highlighter`. The packages
// ship JS without bundled types and there's no `@types/...` package; the
// shape we need is narrow enough that a local module declaration is
// cheaper than authoring a full DT package.

declare module 'react-native-syntax-highlighter' {
  import type { ComponentType, ReactNode } from 'react'
  import type { StyleProp, ViewStyle } from 'react-native'

  export interface SyntaxHighlighterProps {
    language?: string
    style?: unknown
    fontSize?: number
    fontFamily?: string
    highlighter?: 'prism' | 'hljs'
    customStyle?: StyleProp<ViewStyle>
    children?: ReactNode
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>
  export default SyntaxHighlighter
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const tomorrow: unknown
  export { tomorrow }
}
