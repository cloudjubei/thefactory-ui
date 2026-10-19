import { Text, View } from 'react-native'

import {
  FINISHED_FILES_WORD,
  UNFINISHED_FILE_WORD,
  type UnfinishedTestsView,
} from '../../../../headless'
import { nativeFontFamilies, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

/**
 * Native peer of the web `UnfinishedTests`: the files a test run could not
 * finish — each with why and the last it printed — and the files that did, as
 * one passed row unless their suites are listed with the run. Amber, never the
 * red of a failure.
 */
export function UnfinishedTests({ view }: { view: UnfinishedTestsView }) {
  const { theme, status } = useNativeTheme()
  const row = (tone: typeof status.working) => ({
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: nativeRadii[1],
    backgroundColor: tone.softBg,
  })
  return (
    <View style={{ gap: 8 }}>
      {view.files.map((file) => (
        <View key={file.path} style={{ gap: 8 }}>
          <View style={row(status.working)}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.working.softFg }}>
              {UNFINISHED_FILE_WORD}
            </Text>
            <Text
              style={{
                flexShrink: 1,
                fontFamily: nativeFontFamilies.mono,
                fontSize: 12,
                color: status.working.softFg,
              }}
            >
              {file.path}
            </Text>
            <Text style={{ marginLeft: 'auto', fontSize: 12.5, color: status.working.softFg }}>
              {file.reason}
            </Text>
          </View>
          {file.outputTail ? (
            <Text
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: nativeRadii[1],
                backgroundColor: theme.surface.muted,
                fontFamily: nativeFontFamilies.mono,
                fontSize: 11.5,
                color: theme.text.primary,
              }}
            >
              {file.outputTail}
            </Text>
          ) : null}
        </View>
      ))}
      {view.finished && !view.finished.listed ? (
        <View style={row(status.done)}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.done.softFg }}>
            {FINISHED_FILES_WORD}
          </Text>
          <Text style={{ flexShrink: 1, fontSize: 12.5, color: status.done.softFg }}>
            {view.finished.label}
          </Text>
          <Text style={{ marginLeft: 'auto', fontSize: 12.5, color: status.done.softFg }}>
            {view.finished.countLabel}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
