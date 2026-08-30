import { describe, expect, it } from 'vitest'
import { describeLastMessageDelete, refuseWhileRunActive } from './chatMessageDelete'
import {
  CLI_TURN_DELETE_LABEL,
  CLI_TURN_DELETE_RUNNING_LABEL,
  MESSAGE_DELETE_BUSY_LABEL,
  MESSAGE_DELETE_LABEL,
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
