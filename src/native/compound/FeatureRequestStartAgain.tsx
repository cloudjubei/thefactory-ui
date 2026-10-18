import { useState } from 'react'
import { Text, View } from 'react-native'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'
import { FEATURE_REQUEST_START_AGAIN_WORDS as WORDS } from '../../headless/utils/featureRequestViewConstants'
import { workLaunchOptions } from '../../headless/utils/workLaunchView'
import WorkLaunchChooser from './WorkLaunchChooser'

export interface FeatureRequestStartAgainProps {
  /** Its work failed, rather than stopped blocked. */
  failed: boolean
  /** Start the work again, the way chosen. The host owns the call. */
  onStartAgain: (mode: WorkLaunchMode) => void
  /** The way its last work went — offered first. */
  lastMode?: WorkLaunchMode
  busy?: boolean
}

/** Native peer of web's start-again: the button and why, then the same choice every start makes. */
export function FeatureRequestStartAgain({
  failed,
  onStartAgain,
  lastMode,
  busy,
}: FeatureRequestStartAgainProps) {
  const { theme } = useNativeTheme()
  const [choosing, setChoosing] = useState(false)
  if (choosing) {
    return (
      <WorkLaunchChooser
        options={workLaunchOptions({ workLaunchMode: lastMode })}
        onChoose={onStartAgain}
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
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{WORDS.hint(failed)}</Text>
    </View>
  )
}
