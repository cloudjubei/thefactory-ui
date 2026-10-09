import { useState } from 'react'
import { Text, View } from 'react-native'

import { RUN_PENDING_CHANGE_REMOVE_LABEL, runPendingChangesView } from '../../../headless'
import type { ProcessRun } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconClose, IconPlay } from '../../icons'
import { Button } from '../../primitives/Button'
import IconButton from '../../primitives/IconButton'
import DependencyRef from '../stories/DependencyRef'

export type RunPendingChangesProps = {
  run: ProcessRun
  onStart: (changeIds: readonly string[]) => Promise<boolean>
  onRemove: (changeId: string) => Promise<boolean>
}

/** Native peer of web's `RunPendingChanges`: the changes waiting on a run, and starting them. */
export default function RunPendingChanges({ run, onStart, onRemove }: RunPendingChangesProps) {
  const { theme, status } = useNativeTheme()
  const [busy, setBusy] = useState<string | null>(null)
  const view = runPendingChangesView(run)
  if (!view) return null
  const act = (key: string, work: () => Promise<boolean>) => {
    setBusy(key)
    void work().finally(() => setBusy(null))
  }

  return (
    <View
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        gap: nativeSpace[2],
        borderWidth: 1,
        borderRadius: nativeRadii[3],
        borderColor: status.working.softBorder,
        backgroundColor: status.working.softBg,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: 10,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
          {`${view.headline}:`}
        </Text>
        {view.items.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {run.storyId && item.featureId ? (
              <DependencyRef dependency={`${run.storyId}.${item.featureId}`} />
            ) : (
              <Text style={{ fontSize: 12, color: theme.text.primary }}>{item.name}</Text>
            )}
            {item.kindWord ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{item.kindWord}</Text>
            ) : null}
          </View>
        ))}
      </View>
      {view.items.map((item) => (
        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>{item.name}</Text>
            {` — ${item.summary}`}
          </Text>
          <IconButton
            size="sm"
            accessibilityLabel={RUN_PENDING_CHANGE_REMOVE_LABEL}
            disabled={busy !== null}
            onPress={() => act(item.id, () => onRemove(item.id))}
          >
            <IconClose size={14} color={theme.text.secondary} />
          </IconButton>
        </View>
      ))}
      <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{view.hint}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button
          size="sm"
          disabled={!view.canStart || busy !== null}
          loading={busy === 'start'}
          onPress={() => act('start', () => onStart(view.changeIds))}
        >
          <IconPlay size={14} color={theme.text.inverted} />
          {view.startLabel}
        </Button>
      </View>
    </View>
  )
}
