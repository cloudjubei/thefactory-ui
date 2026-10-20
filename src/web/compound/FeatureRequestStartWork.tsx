import { useState } from 'react'
import type { WorkLaunchMode } from 'thefactory-tools/types'
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

/**
 * Starting the work of a request accepted while its launch was left unconfirmed: the button and
 * why, then the same choice every start makes — a process run, or in this chat.
 */
export function FeatureRequestStartWork({
  onStartWork,
  defaultMode,
  busy,
}: FeatureRequestStartWorkProps) {
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
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="primary" onClick={() => setChoosing(true)} disabled={busy}>
        {WORDS.action}
      </Button>
      <span className="text-[12px] leading-normal text-(--text-secondary)">{WORDS.hint}</span>
    </div>
  )
}
