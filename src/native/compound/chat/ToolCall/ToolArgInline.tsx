import { Text, View } from 'react-native'
import { PathDisplay } from '../../PathDisplay'
import type { ToolArgDisplay } from '../../../../headless/utils/toolPreview'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

/**
 * Native peer of web's `ToolArgInline`: the collapsed one-line tool input shown
 * between the tool name and the time chip. A file path (or list of paths)
 * renders with the shared dir+filename `PathDisplay`; a command / search pattern
 * renders as a compact monospace snippet. Occupies the row's flexible slot.
 */
export default function ToolArgInline({ display }: { display: ToolArgDisplay | null }) {
  const { theme } = useNativeTheme()
  if (!display) return <View style={{ flex: 1 }} />

  if (display.kind === 'path') {
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <PathDisplay path={display.path} />
      </View>
    )
  }

  if (display.kind === 'paths') {
    return (
      <View
        style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', overflow: 'hidden' }}
      >
        {display.paths.map((p, i) => (
          <View
            key={`${i}-${p}`}
            style={{ maxWidth: 200, marginRight: i < display.paths.length - 1 ? 10 : 0 }}
          >
            <PathDisplay path={p} />
          </View>
        ))}
      </View>
    )
  }

  const snippet = display.text.replace(/\s+/g, ' ').trim()
  return (
    <Text
      numberOfLines={1}
      style={{
        flex: 1,
        fontFamily: 'Menlo',
        fontSize: 11,
        color: theme.text.secondary,
        backgroundColor: theme.surface.base,
        borderRadius: nativeRadii[1],
        paddingHorizontal: 4,
        paddingVertical: 1,
        overflow: 'hidden',
      }}
    >
      {snippet}
    </Text>
  )
}
