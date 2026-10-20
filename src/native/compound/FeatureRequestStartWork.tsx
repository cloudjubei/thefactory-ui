import { useState } from 'react'
import { Text, View } from 'react-native'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'
import { FEATURE_REQUEST_START_WORK_WORDS as WORDS } from '../../headless/utils/featureRequestViewConstants'
import { workLaunchOptions } from '../../headless/utils/workLaunchView'
import WorkLaunchChooser from './WorkLaunchChooser'

export interface FeatureRequestStartWorkProps {
  /** Start the work, the way chosen. The host owns the call. */
  onStartWork: (mode: WorkLaunchMode) => void
  /** How work last started in the request's project — offered first. */
  defaultMode?: WorkLaunchMode
  busy?: boolean
}

/** Native peer of web's start-work: the button and why, then the same choice every start makes. */
export function FeatureRequestStartWork({
  onStartWork,
  defaultMode,
  busy,
}: FeatureRequestStartWorkProps) {
  const { theme } = useNativeTheme()
  const [choosing, setChoosing] = useState(false)
  if (choosing) {
    return (
      <WorkLaunchChooser
        options={workLaunchOptions({ workLaunchMode: defaultMode })}
        onChoose={onStartWork}
        onCancel={() => setChoosing(false)}
        {...(busy !== undefined ? { busy } : {})}
      />
    )
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ flexDirection: 'row' }}>
        <Button size="sm" variant="primary" onPress={() => setChoosing(true)} disabled={busy}>
          {WORDS.action}
        </Button>
      </View>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{WORDS.hint}</Text>
    </View>
  )
}
