import { Text, View } from 'react-native'

import {
  PROCESS_DROPPED_CHANGE_LABEL,
  processDroppedChangeRows,
  type ProcessRun,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CommitChip from '../chips/CommitChip'

export type DroppedChangesNoteProps = { run: ProcessRun }

/** Native peer of web's `DroppedChangesNote`. */
export default function DroppedChangesNote({ run }: DroppedChangesNoteProps) {
  const { theme } = useNativeTheme()
  const rows = processDroppedChangeRows(run)
  if (rows.length === 0) return null
  return (
    <View
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        gap: 4,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {PROCESS_DROPPED_CHANGE_LABEL}
      </Text>
      {rows.map((row) => (
        <View key={row.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <CommitChip projectId={run.projectId} sha={row.mergeSha} />
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{row.text}</Text>
        </View>
      ))}
    </View>
  )
}
