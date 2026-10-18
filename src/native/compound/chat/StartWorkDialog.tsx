import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import type { StartWorkState } from '../../../headless/hooks/useStartWork'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { workLaunchOptions } from '../../../headless/utils/workLaunchView'
import { WORK_LAUNCH_HEADING } from '../../../headless/utils/workLaunchViewConstants'
import { Modal } from '../../primitives/Modal'
import WorkLaunchChooser from '../WorkLaunchChooser'
import StoryLaunchDock from './StoryLaunchDock'

export type StartWorkDialogProps = {
  /** The start in progress — `useStartWork`. */
  start: Pick<
    StartWorkState,
    'target' | 'mode' | 'busy' | 'error' | 'choose' | 'launch' | 'close' | 'chatAgent'
  >
  /** How work last started in the project — offered first. */
  defaultMode?: WorkLaunchMode
  /** The agent the person's chats run on. */
  chatRunner: 'api' | 'cli'
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  renderProcessRun?: (processRunId: string) => ReactNode
}

/**
 * Every "start work", drawn: the choice of a process run or in this chat, then — for a process
 * run — its launch card. The host opens it with `useStartWork().open` and opens what started.
 */
export default function StartWorkDialog({
  start,
  defaultMode,
  chatRunner,
  renderModelChip,
  renderProcessRun,
}: StartWorkDialogProps) {
  const { target, mode, busy, error, choose, launch, close, chatAgent } = start
  const { status } = useNativeTheme()
  if (!target) return null
  if (mode === 'process') {
    return (
      <StoryLaunchDock
        isOpen
        projectId={target.projectId}
        storyId={target.storyId}
        {...(target.featureIds ? { featureIds: target.featureIds } : {})}
        chatRunner={chatRunner}
        {...(chatAgent ? { agent: chatAgent } : {})}
        onLaunch={launch}
        onClose={close}
        {...(renderModelChip ? { renderModelChip } : {})}
        {...(renderProcessRun ? { renderProcessRun } : {})}
      />
    )
  }
  return (
    <Modal isOpen onClose={close} title={WORK_LAUNCH_HEADING} size="sm">
      <WorkLaunchChooser
        options={workLaunchOptions({ workLaunchMode: defaultMode })}
        onChoose={choose}
        onCancel={close}
        busy={busy}
      />
      {error ? (
        <Text style={{ marginTop: 8, fontSize: 12, color: status.stuck.fg }}>{error}</Text>
      ) : null}
    </Modal>
  )
}
