import { ScrollView, Text, View } from 'react-native'
import { workFilesHeading } from '../../headless/utils/workFiles'
import { nativeFontFamilies } from '../../tokens/native'
import { WORK_FILES_HINT } from '../../headless/utils/workFilesConstants'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type WorkFilesListProps = {
  /** Project-relative paths handed over with the work; nothing shows when empty. */
  files: readonly string[] | undefined
}

/**
 * Native peer of the web `WorkFilesList`: the files that go with work the person is asked to
 * start, each project path in full. Purely presentational.
 */
export default function WorkFilesList({ files }: WorkFilesListProps) {
  const { theme } = useNativeTheme()
  if (!files?.length) return null
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
        {workFilesHeading(files.length)}
      </Text>
      <ScrollView
        nestedScrollEnabled
        style={{
          maxHeight: 160,
          padding: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border.subtle,
        }}
      >
        {files.map((file) => (
          <Text
            key={file}
            style={{ fontSize: 12, fontFamily: nativeFontFamilies.mono, color: theme.text.primary }}
          >
            {file}
          </Text>
        ))}
      </ScrollView>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{WORK_FILES_HINT}</Text>
    </View>
  )
}
