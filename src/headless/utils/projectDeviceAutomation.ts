import type { DataUpdatedEvent } from '../api/sdkTypes'
import { PROJECT_DEVICE_AUTOMATION_RECORD } from './projectDeviceAutomationConstants'

/** Whether a `data:updated` event is `projectId`'s device automation record changing. */
export function isProjectDeviceAutomationUpdate(
  event: DataUpdatedEvent,
  projectId: string,
): boolean {
  return (
    event.scope === projectId &&
    event.type === PROJECT_DEVICE_AUTOMATION_RECORD.type &&
    event.key === PROJECT_DEVICE_AUTOMATION_RECORD.key
  )
}
