import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  PROCESS_RUN_CLOSURE_ACTION_COPY,
  useProcessRunClosure,
  type ProcessRun,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import FeatureClosureList from './FeatureClosureList'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type RunClosurePanelProps = {
  run: ProcessRun
  /** The run as it stands once its features are settled. */
  onSettled?: (run: ProcessRun) => void
}

/**
 * "Settle its features" on a story run that ended: each feature it
 * worked on, what it is now and what the run did, with a pick of what it is
 * left as — pending, blocked (with why), deferred or done. Nothing when there
 * is nothing to settle.
 */
export function RunClosurePanel({ run, onSettled }: RunClosurePanelProps) {
  const { theme, status } = useNativeTheme()
  const closure = useProcessRunClosure(run)
  const [open, setOpen] = useState(true)
  if (closure.rows.length === 0) return null
  return (
    <View
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        gap: nativeSpace[2],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: status.on_hold.softBorder,
        backgroundColor: status.on_hold.softBg,
        padding: nativeSpace[3],
      }}
    >
      <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: status.on_hold.softFg }}>
          {PROCESS_RUN_CLOSURE_ACTION_COPY.label}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>
          {PROCESS_RUN_CLOSURE_ACTION_COPY.detail}
        </Text>
      </Pressable>
      {open ? (
        <>
          <FeatureClosureList rows={closure.rows} onPick={closure.pick} />
          {closure.problem || closure.actionError ? (
            <Text style={{ fontSize: 11, color: status.stuck.softFg }}>
              {closure.actionError ?? closure.problem}
            </Text>
          ) : null}
          <Button
            size="sm"
            disabled={closure.busy || !!closure.problem}
            onPress={() =>
              void closure.settle().then((settled) => {
                if (settled) onSettled?.(settled)
              })
            }
          >
            Settle these features
          </Button>
        </>
      ) : null}
    </View>
  )
}

export default RunClosurePanel
