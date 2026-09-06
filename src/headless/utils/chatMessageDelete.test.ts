import { describe, expect, it } from 'vitest'
import { describeLastMessageDelete, refuseWhileRunActive } from './chatMessageDelete'
import {
  CLI_TURN_DELETE_LABEL,
  CLI_TURN_DELETE_RUNNING_LABEL,
  MESSAGE_DELETE_BUSY_LABEL,
  MESSAGE_DELETE_LABEL,
  HISTORY_LOCKED_LABEL,
  SIGNED_OFF_TURN_LOCKED_LABEL,
} from './chatMessageDeleteConstants'
import type { MessageDeleteControl, MessageDeleteInput } from './chatMessageDeleteTypes'

const base: MessageDeleteInput = {
  hasDeleteAction: true,
  isLast: true,
  turnInFlight: false,
}

describe('describeLastMessageDelete', () => {
  it('offers nothing when the host wired no delete action', () => {
    expect(describeLastMessageDelete({ ...base, hasDeleteAction: false })).toBeUndefined()
  })

  it('offers nothing on a row that is not the last message', () => {
    expect(describeLastMessageDelete({ ...base, isLast: false })).toBeUndefined()
  })

  it('offers nothing on a CLI turn that is not the last message', () => {
    expect(describeLastMessageDelete({ ...base, isLast: false, runId: 'run-1' })).toBeUndefined()
  })

  it('describes a plain last message as a single-message delete', () => {
    expect(describeLastMessageDelete(base)).toEqual({
      label: MESSAGE_DELETE_LABEL,
      disabled: false,
    })
  })

  it('omits cliRunId for a plain message', () => {
    expect(describeLastMessageDelete(base)).not.toHaveProperty('cliRunId')
  })

  it('refuses a plain message while a turn is in flight', () => {
    expect(describeLastMessageDelete({ ...base, turnInFlight: true })).toEqual({
      label: MESSAGE_DELETE_BUSY_LABEL,
      disabled: true,
    })
  })

  it('describes a finished CLI turn as removing the whole run', () => {
    expect(describeLastMessageDelete({ ...base, runId: 'run-1' })).toEqual({
      label: CLI_TURN_DELETE_LABEL,
      disabled: false,
      cliRunId: 'run-1',
    })
  })

  it('refuses a CLI turn while a turn is in flight', () => {
    expect(describeLastMessageDelete({ ...base, runId: 'run-1', turnInFlight: true })).toEqual({
      label: CLI_TURN_DELETE_RUNNING_LABEL,
      disabled: true,
      cliRunId: 'run-1',
    })
  })

  it('does not treat an empty runId as a CLI turn', () => {
    expect(describeLastMessageDelete({ ...base, runId: '' })).toEqual({
      label: MESSAGE_DELETE_LABEL,
      disabled: false,
    })
  })
})

describe('refuseWhileRunActive', () => {
  const enabled: MessageDeleteControl = {
    label: CLI_TURN_DELETE_LABEL,
    disabled: false,
    cliRunId: 'run-1',
  }

  it('passes an absent control through', () => {
    expect(refuseWhileRunActive(undefined, true)).toBeUndefined()
  })

  it('leaves an enabled control alone when the run is not active', () => {
    expect(refuseWhileRunActive(enabled, false)).toBe(enabled)
  })

  it('refuses an enabled control when the run is still active', () => {
    expect(refuseWhileRunActive(enabled, true)).toEqual({
      label: CLI_TURN_DELETE_RUNNING_LABEL,
      disabled: true,
      cliRunId: 'run-1',
    })
  })

  it('does not mutate the control it was given', () => {
    refuseWhileRunActive(enabled, true)
    expect(enabled).toEqual({ label: CLI_TURN_DELETE_LABEL, disabled: false, cliRunId: 'run-1' })
  })

  it('keeps an already-refused control as it is', () => {
    const busy: MessageDeleteControl = {
      label: MESSAGE_DELETE_BUSY_LABEL,
      disabled: true,
    }
    expect(refuseWhileRunActive(busy, true)).toBe(busy)
  })
})

describe('describeLastMessageDelete: locked history', () => {
  it('still RENDERS the control when history is locked, but refuses', () => {
    // Hiding it reads as "deleting is impossible"; the user asked to be told the
    // messages are deliberately kept, not to have the affordance vanish.
    const control = describeLastMessageDelete({ ...base, historyLocked: true })
    expect(control).toBeDefined()
    expect(control?.disabled).toBe(true)
    expect(control?.locked).toBe(true)
    expect(control?.label).toBe(HISTORY_LOCKED_LABEL)
  })

  it('locks a turn whose work was signed off, naming that as the reason', () => {
    const control = describeLastMessageDelete({
      ...base,
      runId: 'r1',
      turnSignedOff: true,
    })
    expect(control?.locked).toBe(true)
    expect(control?.disabled).toBe(true)
    expect(control?.label).toBe(SIGNED_OFF_TURN_LOCKED_LABEL)
  })

  it('locking outranks the in-flight refusal — a closed chat is not "try again later"', () => {
    const control = describeLastMessageDelete({
      ...base,
      historyLocked: true,
      turnInFlight: true,
    })
    expect(control?.label).toBe(HISTORY_LOCKED_LABEL)
  })

  it('leaves an ordinary turn deletable', () => {
    const control = describeLastMessageDelete({ ...base, runId: 'r1' })
    expect(control?.locked).toBeUndefined()
    expect(control?.disabled).toBe(false)
  })

  it('never offers a control at all when the host wired none, locked or not', () => {
    expect(
      describeLastMessageDelete({ ...base, hasDeleteAction: false, historyLocked: true }),
    ).toBeUndefined()
  })
})

describe('refuseWhileRunActive: locked control', () => {
  it('does not downgrade a locked label to the running one', () => {
    const locked = describeLastMessageDelete({ ...base, historyLocked: true })
    expect(refuseWhileRunActive(locked, true)?.label).toBe(HISTORY_LOCKED_LABEL)
  })
})
