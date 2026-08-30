import {
  CLI_TURN_DELETE_LABEL,
  CLI_TURN_DELETE_RUNNING_LABEL,
  MESSAGE_DELETE_BUSY_LABEL,
  MESSAGE_DELETE_LABEL,
} from './chatMessageDeleteConstants'
import type { MessageDeleteControl, MessageDeleteInput } from './chatMessageDeleteTypes'

/**
 * What the delete control on a chat row does, or `undefined` when the row must
 * not offer one. Shared by the web and native message lists so a CLI turn and an
 * API message expose the same affordance under the same rules.
 *
 * A CLI turn's rows are derived from the run record; only the assistant message
 * carrying the `runId` is stored, so it is the only row that can carry the
 * control — and the label has to admit the whole turn goes with it.
 */
export function describeLastMessageDelete(
  input: MessageDeleteInput,
): MessageDeleteControl | undefined {
  if (!input.hasDeleteAction) return undefined
  if (!input.isLast) return undefined

  const runId = input.runId ? input.runId : undefined
  if (runId !== undefined) {
    return {
      label: input.turnInFlight ? CLI_TURN_DELETE_RUNNING_LABEL : CLI_TURN_DELETE_LABEL,
      disabled: input.turnInFlight,
      cliRunId: runId,
    }
  }
  return {
    label: input.turnInFlight ? MESSAGE_DELETE_BUSY_LABEL : MESSAGE_DELETE_LABEL,
    disabled: input.turnInFlight,
  }
}

/**
 * Second gate on a CLI turn's control, applied by the run view with what the RUN
 * RECORD says rather than what this browser session remembers. A turn started
 * before a reload is invisible to the client's own sending state, and deleting
 * its message would leave the runner writing back into a turn that no longer
 * exists — so the record's own live status refuses on its own authority.
 */
export function refuseWhileRunActive(
  control: MessageDeleteControl | undefined,
  runActive: boolean,
): MessageDeleteControl | undefined {
  if (!control) return undefined
  if (!runActive) return control
  if (control.disabled) return control
  return { ...control, label: CLI_TURN_DELETE_RUNNING_LABEL, disabled: true }
}
