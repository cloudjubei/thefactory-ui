import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  PROCESS_TURN_LIMIT_CHIP,
  PROCESS_TURN_LIMIT_EDIT_LABEL,
  PROCESS_TURN_LIMIT_SAVE_LABEL,
  processRunTurnLimitView,
  processTurnLimitOfView,
  type ProcessRun,
  type ProcessTurnLimit,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { TurnLimitField } from '../TurnLimitField'

export type RunTurnLimitChipProps = {
  run: ProcessRun
  /** Set the limit from the next step on; absent once the run has ended, when it only shows it. */
  onSet?: (limit: ProcessTurnLimit) => Promise<boolean>
}

/** A run's turn limit in its head — and, while it runs, the way to raise or lift it. */
export function RunTurnLimitChip({ run, onSet }: RunTurnLimitChipProps) {
  const { theme } = useNativeTheme()
  const view = processRunTurnLimitView(run)
  const [editing, setEditing] = useState<{ limited: boolean; maxTurns: number } | undefined>()
  const [saving, setSaving] = useState(false)
  const label = PROCESS_TURN_LIMIT_CHIP(view.limited, view.maxTurns)
  return (
    <>
      <Pressable
        disabled={!onSet}
        accessibilityRole="button"
        accessibilityLabel={onSet ? PROCESS_TURN_LIMIT_EDIT_LABEL : label}
        onPress={() => setEditing({ limited: view.limited, maxTurns: view.maxTurns })}
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          paddingHorizontal: nativeSpace[2],
          paddingVertical: 2,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{label}</Text>
      </Pressable>
      {editing && onSet ? (
        <Modal
          isOpen
          onClose={() => setEditing(undefined)}
          title={PROCESS_TURN_LIMIT_EDIT_LABEL}
          footer={
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button variant="secondary" onPress={() => setEditing(undefined)}>
                Cancel
              </Button>
              <Button
                disabled={saving}
                onPress={() => {
                  setSaving(true)
                  void onSet(processTurnLimitOfView(editing))
                    .then((ok) => {
                      if (ok) setEditing(undefined)
                    })
                    .finally(() => setSaving(false))
                }}
              >
                {PROCESS_TURN_LIMIT_SAVE_LABEL}
              </Button>
            </View>
          }
        >
          <TurnLimitField
            {...view}
            limited={editing.limited}
            maxTurns={editing.maxTurns}
            onChange={setEditing}
          />
        </Modal>
      ) : null}
    </>
  )
}

export default RunTurnLimitChip
