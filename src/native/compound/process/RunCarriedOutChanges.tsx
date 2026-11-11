import { Text, View } from 'react-native'

import { runCarriedOutChangesView } from '../../../headless'
import type { ProcessRun } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import DependencyRef from '../stories/DependencyRef'

export type RunCarriedOutChangesProps = {
  run: ProcessRun
}

/** Native peer of web's `RunCarriedOutChanges`: the feature edits the run carried out itself. */
export default function RunCarriedOutChanges({ run }: RunCarriedOutChangesProps) {
  const { theme, status } = useNativeTheme()
  const view = runCarriedOutChangesView(run)
  if (!view) return null

  return (
    <View
      accessibilityLabel={view.title}
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        gap: nativeSpace[2],
        borderWidth: 1,
        borderRadius: nativeRadii[3],
        borderColor: status.done.softBorder,
        backgroundColor: status.done.softBg,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
        {view.title}
      </Text>
      {view.items.map((item) => (
        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
          {run.storyId ? <DependencyRef dependency={`${run.storyId}.${item.featureId}`} /> : null}
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
            {run.storyId ? null : (
              <Text
                style={{ fontWeight: '600', color: theme.text.primary }}
              >{`${item.name} `}</Text>
            )}
            {`${item.kindWord} — ${item.summary}`}
          </Text>
        </View>
      ))}
    </View>
  )
}
