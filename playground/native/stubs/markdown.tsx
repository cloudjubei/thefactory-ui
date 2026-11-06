import { Text } from 'react-native'

/** Markdown as its plain text. The package ships JSX in `.js`, which a web build cannot read. */
export default function Markdown({ children }: { children?: string }) {
  return <Text>{children}</Text>
}

export class MarkdownIt {}
