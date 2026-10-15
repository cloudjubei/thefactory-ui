import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { RUN_MODEL_PENDING_SUFFIX, type RunModelChipView } from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import RunModelChip from '../chat/signoff/RunModelChip'

export type RunModelControlProps = {
  view: Pick<RunModelChipView, 'model' | 'editable' | 'pending'>
  /** The host's chooser chip for the run's model; without one the chip is read-only. */
  chip?: ReactNode
}

/**
 * Native peer of the web `RunModelControl`: the host's chooser chip while the
 * run can still change model — with a change waiting for the step at work
 * spelled out around it — and the read-only chip once it has ended.
 */
export default function RunModelControl({ view, chip }: RunModelControlProps) {
  const { theme } = useNativeTheme()
  if (!view.editable || !chip) return view.model ? <RunModelChip model={view.model} /> : null
  const pending = view.pending
  const caption = { fontSize: 11.5, color: theme.text.muted }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      {pending ? <Text style={caption}>{pending.from} →</Text> : null}
      {chip}
      {pending ? <Text style={caption}>{RUN_MODEL_PENDING_SUFFIX}</Text> : null}
    </View>
  )
}
