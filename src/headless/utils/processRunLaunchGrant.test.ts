import { describe, expect, it, vi } from 'vitest'

import {
  isStartProcessRunGrant,
  processRunAskView,
  processRunLaunchGrant,
  processRunStartBody,
  startProcessRunGrantSummary,
} from './processRunLaunchGrant'
import { isToolAskDecidedOnRow } from './approvalGrant'

describe('isStartProcessRunGrant', () => {
  it('knows the launch tool', () => {
    expect(isStartProcessRunGrant({ toolName: 'startProcessRun' })).toBe(true)
    expect(isStartProcessRunGrant({ toolName: 'startFeatureWork' })).toBe(false)
  })

  it('keeps the composer’s place, as every launch does', () => {
    expect(isToolAskDecidedOnRow('startProcessRun')).toBe(false)
  })
})

describe('startProcessRunGrantSummary', () => {
  it('reads what the agent named', () => {
    expect(
      startProcessRunGrantSummary({
        args: {
          processId: 'check-a-flow',
          inputValues: { rounds: 7 },
          title: 'Trial',
          note: 'Be gentle',
          baseBranch: 'dev',
          runner: 'cli',
          cliTool: 'claude',
          cliModel: 'sonnet',
          cliCredentialId: 'c1',
          turnLimit: { limitTurns: true, maxTurns: 5 },
        },
      }),
    ).toEqual({
      processId: 'check-a-flow',
      inputValues: { rounds: 7 },
      title: 'Trial',
      note: 'Be gentle',
      baseBranch: 'dev',
      runner: 'cli',
      cliTool: 'claude',
      cliModel: 'sonnet',
      cliCredentialId: 'c1',
      turnLimit: { limitTurns: true, maxTurns: 5 },
    })
  })

  it('takes nothing it cannot read', () => {
    expect(
      startProcessRunGrantSummary({
        args: { processId: 7, inputValues: [1], runner: 'other', title: '  ' },
      }),
    ).toEqual({ inputValues: {} })
  })

  it('reads the detail when the ask has no args of its own', () => {
    const summary = startProcessRunGrantSummary({ detail: { args: { processId: 'x' } } })
    expect(summary.processId).toBe('x')
  })
})

describe('processRunLaunchGrant', () => {
  const grantWith = () => {
    const onLaunch = vi.fn(async () => {})
    const onCancel = vi.fn()
    const grant = processRunLaunchGrant({
      processId: 'p1',
      chatRunner: 'cli',
      agent: { runner: 'cli', cliTool: 'claude' },
      onLaunch,
      onCancel,
    })
    return { grant, onLaunch, onCancel }
  }

  it('reads as the agent’s ask does', () => {
    const { grant } = grantWith()
    expect(isStartProcessRunGrant(grant)).toBe(true)
    expect(startProcessRunGrantSummary(grant)).toMatchObject({
      processId: 'p1',
      runner: 'cli',
      cliTool: 'claude',
    })
  })

  it('launches with the card’s picks over the person’s agent', async () => {
    const { grant, onLaunch } = grantWith()
    await grant.decide('once', { cliTool: 'codex', inputValues: { rounds: 7 } })
    expect(onLaunch).toHaveBeenCalledWith({
      runner: 'cli',
      cliTool: 'codex',
      inputValues: { rounds: 7 },
    })
  })

  it('closes on Not now, launching nothing', async () => {
    const { grant, onLaunch, onCancel } = grantWith()
    await grant.decide('deny')
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onLaunch).not.toHaveBeenCalled()
  })

  it('launches from no agent of its own', async () => {
    const onLaunch = vi.fn(async () => {})
    const grant = processRunLaunchGrant({
      processId: 'p1',
      chatRunner: 'api',
      onLaunch,
      onCancel: () => {},
    })
    await grant.decide('once')
    expect(onLaunch).toHaveBeenCalledWith({})
  })
})

describe('processRunStartBody', () => {
  it('sends what the route takes and nothing it would refuse', () => {
    expect(
      processRunStartBody('p', 'x', {
        inputValues: { rounds: 7 },
        mode: 'process',
        runner: 'cli',
        note: undefined,
        spendCapUsd: 5,
      }),
    ).toEqual({
      projectId: 'p',
      processId: 'x',
      inputValues: { rounds: 7 },
      runner: 'cli',
      spendCapUsd: 5,
    })
  })

  it('sends the fake-data choice confirmed on the card', () => {
    expect(processRunStartBody('p', 'x', { fakeDataInProduct: 'keep-out' })).toEqual({
      projectId: 'p',
      processId: 'x',
      fakeDataInProduct: 'keep-out',
    })
  })
})

describe('processRunAskView', () => {
  it('names the process, and asks the plain way when it cannot', () => {
    expect(processRunAskView('Check a flow')).toMatchObject({
      ask: 'Start a run',
      headline: 'Check a flow',
      verb: 'Start run',
      icon: 'run',
    })
    expect(processRunAskView(undefined).headline).toBe('Start a run')
  })
})
