import { useState } from 'react'
import type { WorkLaunchMode } from 'thefactory-tools/types'
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

/**
 * Starting a request's work again once it ended blocked or failed: the button and why, then the
 * same choice every start makes — a process run, or in this chat — its last way offered first.
 */
export function FeatureRequestStartAgain({
  failed,
  onStartAgain,
  lastMode,
  busy,
}: FeatureRequestStartAgainProps) {
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
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="primary" onClick={() => setChoosing(true)} disabled={busy}>
        {WORDS.action}
      </Button>
      <span className="text-[12px] leading-normal text-(--text-secondary)">
        {WORDS.hint(failed)}
      </span>
    </div>
  )
}
