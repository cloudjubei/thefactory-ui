import { Text, View } from 'react-native'

import {
  PROCESS_WORK_BRANCH_CHANGES_LABEL,
  processWorkBranchChangeRows,
  type ProcessRun,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CommitChip from '../chips/CommitChip'

export type WorkBranchChangesNoteProps = { run: ProcessRun }

/** Native peer of web's `WorkBranchChangesNote`. */
export default function WorkBranchChangesNote({ run }: WorkBranchChangesNoteProps) {
  const { theme } = useNativeTheme()
  const rows = processWorkBranchChangeRows(run)
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
        {PROCESS_WORK_BRANCH_CHANGES_LABEL}
      </Text>
      {rows.map((row) => (
        <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CommitChip projectId={run.projectId} sha={row.sha} />
          <Text numberOfLines={2} style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
            {row.summary}
          </Text>
        </View>
      ))}
    </View>
  )
}
