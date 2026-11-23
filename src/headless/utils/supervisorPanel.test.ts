import { describe, expect, it } from 'vitest'
import { managerOutcomeView } from './managerCards'
import { supervisorPanelView } from './supervisorPanel'
import type { ScopeStop, SupervisorRecord } from './supervisorPanelTypes'

const RECORD: SupervisorRecord = {
  scope: { kind: 'project', projectId: 'tools' },
  enabled: true,
  agent: true,
  actions: [
    {
      id: 'a1',
      at: 1_000,
      kind: 'answered',
      what: 'Retried Implement after a flaky check',
      runId: 'r1',
      projectId: 'tools',
      choice: 'retry',
      result: 'The step passed on the retry.',
    },
    { id: 'a2', at: 2_000, kind: 'asked', what: 'Asked about the base break', runId: 'r2' },
    { id: 'a3', at: 3_000, kind: 'started', what: 'Started “Queue panel”' },
    {
      id: 'a4',
      at: 4_000,
      kind: 'refused',
      what: 'Could not start “Readiness”',
      result: 'No slot',
    },
  ],
  fallbackModel: { runner: 'cli', cli: 'claude', model: 'claude-sonnet-4-5' },
}

const STOP: ScopeStop = {
  runId: 'r2',
  rootRunId: 'r2',
  parkedAt: 5_000,
  reason: 'step-failed',
  stepId: 'implement',
  stepName: 'Implement',
  detail: 'The base branch fails its own checks.',
  signature: 'sig',
  managerHandling: false,
  projectId: 'tools',
  title: 'Queue panel',
  forPerson: {
    question: 'main fails its own checks. Fix main first, or carry on?',
    recommended: { choice: 'retry', label: 'Fix main first', note: 'A base fix run' },
    options: [
      { choice: 'retry', label: 'Fix main first', note: 'A base fix run' },
      { choice: 'continue', label: 'Carry on' },
    ],
  },
  asks: [{ actionId: 't1', kind: 'tool', toolName: 'writeFile' }],
  manager: { on: true, handling: false, escalated: false },
} as ScopeStop

describe('supervisorPanelView', () => {
  it('reads the switch on, with what it means and the fallback model', () => {
    const view = supervisorPanelView(RECORD, [])
    expect(view.enabled).toBe(true)
    expect(view.switchLabel).toBe('Supervisor')
    expect(view.switchDetail).toMatch(/^On:/)
    expect(view.fallbackLine).toBe('On a credit stop it moves the run to claude-sonnet-4-5')
  })

  it('reads the switch off, and the person’s pick over the record while it is on its way', () => {
    expect(supervisorPanelView({ ...RECORD, enabled: false }, []).switchDetail).toMatch(/^Off:/)
    expect(supervisorPanelView(RECORD, [], false).enabled).toBe(false)
    expect(supervisorPanelView(undefined, []).enabled).toBe(false)
  })

  it('lists what it did newest first as the manager’s Handled cards, leaving its asks to the asks', () => {
    const view = supervisorPanelView(RECORD, [])
    expect(view.actions.map((a) => a.id)).toEqual(['a4', 'a3', 'a1'])
    const answered = managerOutcomeView(view.actions[2]!.card, view.actions[2]!.standing)
    expect(answered).toMatchObject({
      headline: 'Retried Implement after a flaky check',
      tone: 'handled',
      pill: 'Handled',
      why: 'A routine stop: answered as you would.',
      result: 'The step passed on the retry.',
      did: 'retry',
    })
    const refused = managerOutcomeView(view.actions[0]!.card, view.actions[0]!.standing)
    expect(refused).toMatchObject({ pill: 'Did not help', did: 'start queued work' })
    expect(view.actions[2]).toMatchObject({ runId: 'r1', projectId: 'tools' })
  })

  it('lists each stop it hands over with its question and the recommended answer first', () => {
    const view = supervisorPanelView(RECORD, [
      STOP,
      { ...STOP, runId: 'r3', forPerson: undefined },
      { ...STOP, runId: 'r4', managerHandling: true },
    ])
    expect(view.asks).toHaveLength(1)
    expect(view.asks[0]).toMatchObject({
      runId: 'r2',
      title: 'Queue panel',
      where: 'Implement',
      question: 'main fails its own checks. Fix main first, or carry on?',
      toolAsks: 1,
    })
    expect(view.asks[0]?.answers).toEqual([
      { choice: 'retry', label: 'Fix main first', note: 'A base fix run', recommended: true },
      { choice: 'continue', label: 'Carry on', recommended: false },
    ])
  })

  it('names the stop’s reason when it has no step', () => {
    const view = supervisorPanelView(RECORD, [{ ...STOP, stepName: undefined, stepId: undefined }])
    expect(view.asks[0]?.where).toBe('step-failed')
  })
})
