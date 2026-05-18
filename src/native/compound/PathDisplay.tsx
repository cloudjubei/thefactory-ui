import { Text, View } from 'react-native'
import { splitPath } from '../../headless/utils/path'
import { nativeLightTheme } from '../../tokens/native'

export { splitPath }

export interface PathDisplayProps {
  path: string
}

// Directory left-truncates (one-line, ellipsised) and the bold filename
// stays anchored to the right — mirrors the web peer's RTL-flip trick adapted
// to RN's truncation model.
export function PathDisplay({ path }: PathDisplayProps) {
  const { dir, name } = splitPath(path)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', minWidth: 0 }}>
      {dir ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="head"
          style={{ flexShrink: 1, color: nativeLightTheme.text.muted }}
        >
          {`/${dir}`}
        </Text>
      ) : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="middle"
        style={{
          flexShrink: 0,
          fontFamily: 'Menlo',
          fontWeight: '600',
          color: nativeLightTheme.text.primary,
        }}
      >
        {dir ? ` ${name}` : name}
      </Text>
    </View>
  )
}
