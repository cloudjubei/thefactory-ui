import { describe, expect, it, vi } from 'vitest'

import type { ProcessRun, ProcessRunTotals } from 'thefactory-tools/types'

import {
  processRunModelChipView,
  processRunModelPick,
  runModelChangeBody,
  runModelChipSlot,
  runModelShortLabel,
} from './runModelChange'
import {
  RUN_MODEL_NOTE_NEXT_STEP,
  RUN_MODEL_NOTE_NOW,
  RUN_MODEL_NOTE_WAITING,
} from './runModelChangeConstants'

const OPUS_INPUT = {
  runner: 'cli',
  cliRunner: { cli: 'claude-code', model: 'claude-opus-5-5', authCredentialId: 'c1' },
}
const OPUS = { runner: 'cli' as const, cli: 'claude-code', model: 'claude-opus-5-5' }
const SONNET = { runner: 'cli' as const, cli: 'claude-code', model: 'claude-sonnet-5-5' }

function totals(over: Partial<ProcessRunTotals> = {}): ProcessRunTotals {
  return {
    workMs: 0,
    time: {} as ProcessRunTotals['time'],
    ticking: false,
    at: 1,
    steps: {},
    ...over,
  }
}

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'r1',
    projectId: 'p1',
    title: 'Fonts',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'D',
      steps: [],
      loops: [],
      frozenAt: 0,
    },
    status: 'running',
    loopCounts: {},
    ledger: [],
    input: OPUS_INPUT,
    startedAt: 0,
    updatedAt: 0,
    ...over,
  }
}

describe('runModelShortLabel', () => {
  it('names a Claude model as a person reads it', () => {
    expect(runModelShortLabel(OPUS)).toBe('Opus 5.5')
  })

  it('names a CLI asked for no model by the CLI', () => {
    expect(runModelShortLabel({ runner: 'cli', cli: 'codex' })).toBe('Codex')
  })

  it('names the API', () => {
    expect(runModelShortLabel({ runner: 'api' })).toBe('API')
  })
})

describe('processRunModelPick', () => {
  it('is the CLI, model and login the run’s launch chose', () => {
    expect(processRunModelPick(run())).toEqual({
      api: false,
      cli: 'claude-code',
      model: 'claude-opus-5-5',
      credentialId: 'c1',
    })
  })

  it('is the person’s later choice, with its own login', () => {
    expect(
      processRunModelPick(run({ modelOverride: { ...SONNET, at: 1, authCredentialId: 'c2' } })),
    ).toEqual({ api: false, cli: 'claude-code', model: 'claude-sonnet-5-5', credentialId: 'c2' })
  })

  it('drops the launch’s login once a choice named none', () => {
    expect(
      processRunModelPick(run({ modelOverride: { runner: 'cli', cli: 'codex', at: 1 } })),
    ).toEqual({ api: false, cli: 'codex' })
  })

  it('is the API for a run on the API', () => {
    expect(processRunModelPick(run({ input: { runner: 'api' } }))).toEqual({ api: true })
  })

  it('is the API for a run whose launch named nothing', () => {
    expect(processRunModelPick(run({ input: undefined }))).toEqual({ api: true })
  })

  it('carries the effort the run runs at, on either side', () => {
    expect(
      processRunModelPick(
        run({
          modelOverride: { runner: 'cli', cli: 'codex', model: 'gpt-5.5', effort: 'low', at: 1 },
        }),
      ),
    ).toEqual({ api: false, cli: 'codex', model: 'gpt-5.5', effort: 'low' })
    expect(processRunModelPick(run({ input: { runner: 'api', effort: 'xhigh' } }))).toEqual({
      api: true,
      effort: 'xhigh',
    })
    expect(
      processRunModelPick(run({ modelOverride: { runner: 'api', effort: 'max', at: 2 } })),
    ).toEqual({ api: true, effort: 'max' })
  })
})

describe('processRunModelChipView', () => {
  it('is editable while the run is live, and says a change waits for the step at work', () => {
    const view = processRunModelChipView(run({ totals: totals({ workingModels: [OPUS] }) }))
    expect(view.editable).toBe(true)
    expect(view.note).toBe(RUN_MODEL_NOTE_NEXT_STEP)
    expect(view.pending).toBeUndefined()
    expect(view.model).toMatchObject({ tag: 'CLI', tool: 'claude-code', model: 'claude-opus-5-5' })
  })

  it('shows a change waiting while the agent at work runs on the model before it', () => {
    const view = processRunModelChipView(
      run({
        modelOverride: { ...SONNET, at: 1 },
        totals: totals({ workingModels: [OPUS] }),
      }),
    )
    expect(view.pending).toEqual({ from: 'Opus 5.5', to: 'Sonnet 5.5' })
    expect(view.note).toBe(RUN_MODEL_NOTE_NEXT_STEP)
  })

  it('names a switch to the API while a CLI agent finishes its step', () => {
    const view = processRunModelChipView(
      run({ modelOverride: { runner: 'api', at: 1 }, totals: totals({ workingModels: [OPUS] }) }),
    )
    expect(view.pending).toEqual({ from: 'Opus 5.5', to: 'API' })
  })

  it('applies at once while the run waits on the person', () => {
    const view = processRunModelChipView(
      run({ status: 'parked', modelOverride: { ...SONNET, at: 1 }, totals: totals() }),
    )
    expect(view.editable).toBe(true)
    expect(view.pending).toBeUndefined()
    expect(view.note).toBe(RUN_MODEL_NOTE_WAITING)
  })

  it('applies at once to a live run with no agent at work', () => {
    expect(processRunModelChipView(run({ status: 'pending' })).note).toBe(RUN_MODEL_NOTE_NOW)
  })

  it('keeps an agent waiting on the person mid-step on its model: the change waits for its step', () => {
    const view = processRunModelChipView(
      run({
        status: 'parked',
        modelOverride: { ...SONNET, at: 1 },
        totals: totals({ workingModels: [OPUS] }),
      }),
    )
    expect(view.note).toBe(RUN_MODEL_NOTE_NEXT_STEP)
    expect(view.pending).toEqual({ from: 'Opus 5.5', to: 'Sonnet 5.5' })
  })

  it('is read-only once the run has ended', () => {
    for (const status of ['succeeded', 'failed', 'cancelled'] as const) {
      const view = processRunModelChipView(run({ status, totals: totals() }))
      expect(view.editable).toBe(false)
      expect(view.pending).toBeUndefined()
    }
  })

  it('shows no change waiting on an ended run, even one whose record kept an agent at work', () => {
    const view = processRunModelChipView(
      run({
        status: 'cancelled',
        modelOverride: { ...SONNET, at: 1 },
        totals: totals({ workingModels: [OPUS] }),
      }),
    )
    expect(view.pending).toBeUndefined()
    expect(view.note).toBe(RUN_MODEL_NOTE_NOW)
  })

  it('has no model for a run whose launch named none', () => {
    expect(processRunModelChipView(run({ input: undefined })).model).toBeUndefined()
  })
})

describe('runModelChangeBody', () => {
  it('asks for the API', () => {
    expect(runModelChangeBody({ api: true })).toEqual({ runner: 'api' })
  })

  it('asks for a CLI with its model and login', () => {
    expect(
      runModelChangeBody({ api: false, cli: 'codex', model: 'gpt-5.5', credentialId: 'c2' }),
    ).toEqual({ runner: 'cli', cliTool: 'codex', cliModel: 'gpt-5.5', cliCredentialId: 'c2' })
  })

  it('asks for the effort on either side', () => {
    expect(runModelChangeBody({ api: true, effort: 'high' })).toEqual({
      runner: 'api',
      effort: 'high',
    })
    expect(runModelChangeBody({ api: false, cli: 'codex', effort: 'low' })).toEqual({
      runner: 'cli',
      cliTool: 'codex',
      effort: 'low',
    })
  })

  it('asks for a model alone on the run’s own CLI', () => {
    expect(runModelChangeBody({ api: false, model: 'opus' })).toEqual({
      runner: 'cli',
      cliModel: 'opus',
    })
  })
})

describe('runModelChipSlot', () => {
  const pick = { api: false, cli: 'claude-code', model: 'opus', credentialId: 'c1' }

  it('shows what the run runs on', () => {
    const slot = runModelChipSlot(pick, vi.fn())
    expect(slot).toMatchObject({ model: 'opus', cli: 'claude-code', api: false })
  })

  it('keeps the run’s CLI and login when only the model is picked', () => {
    const onChange = vi.fn()
    runModelChipSlot(pick, onChange).onPick('sonnet')
    expect(onChange).toHaveBeenCalledWith({
      api: false,
      cli: 'claude-code',
      model: 'sonnet',
      credentialId: 'c1',
    })
  })

  it('takes another CLI with the login and model the chip picked for it', () => {
    const onChange = vi.fn()
    runModelChipSlot(pick, onChange).onPickCli('codex', 'c9', 'gpt-5.5')
    expect(onChange).toHaveBeenCalledWith({
      api: false,
      cli: 'codex',
      model: 'gpt-5.5',
      credentialId: 'c9',
    })
  })

  it('takes the API', () => {
    const onChange = vi.fn()
    runModelChipSlot(pick, onChange).onPickApi()
    expect(onChange).toHaveBeenCalledWith({ api: true })
  })

  it('shows the run’s effort and changes it alone, keeping the rest', () => {
    const onChange = vi.fn()
    const slot = runModelChipSlot({ ...pick, effort: 'high' }, onChange)
    expect(slot.effort).toBe('high')
    slot.onPickEffort('max')
    expect(onChange).toHaveBeenLastCalledWith({ ...pick, effort: 'max' })
    slot.onPickEffort(undefined)
    expect(onChange).toHaveBeenLastCalledWith(pick)
    expect(runModelChipSlot(pick, vi.fn()).effort).toBeUndefined()
  })
})
