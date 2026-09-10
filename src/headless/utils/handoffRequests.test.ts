import { describe, expect, it } from 'vitest'

import { handoffRequest } from './handoffRequests'

const lint = {
  id: 'lint' as const,
  label: 'Lint',
  noun: 'lint',
  setupVerb: 'add a lint config',
  detail: '2 errors',
  output: undefined,
}

const walkthrough = {
  id: 'walkthrough' as const,
  label: 'Walkthrough',
  noun: 'a walkthrough recording',
  setupVerb: 'record a walkthrough',
  detail: 'Not captured on this branch.',
  output: undefined,
}

describe('handoffRequest — fix', () => {
  const req = handoffRequest(lint, 'fix', { branch: 'agent/abc' })

  it('names the thing on the button and the confirm', () => {
    expect(req.buttonLabel).toBe('Ask the agent to fix this')
    expect(req.title).toBe('Ask the agent to fix lint?')
  })

  it('states the branch, the scope, the non-effects and the price', () => {
    expect(req.facts.map((f) => f.label)).toEqual(['Works on', 'Touches', "Won't", 'Costs'])
    expect(req.facts[0].value).toBe('agent/abc')
    expect(req.facts[3].value).toBe('one agent run')
  })

  it('warns that skipping a check is not fixing it, and that evidence goes stale', () => {
    expect(req.caveat).toMatch(/Removing or skipping a check does not count as fixing it/)
    expect(req.caveat).toMatch(/invalidate/)
  })

  it('tells the agent what failed, where, and to file the result', () => {
    expect(req.message).toContain('On the review branch agent/abc, lint failed: 2 errors.')
    expect(req.message).toMatch(/do not remove or skip the check/)
    expect(req.message).toMatch(/file the result as evidence on this run/)
  })

  it('appends the failing output, truncated past 800 characters', () => {
    const long = 'x'.repeat(1000)
    const msg = handoffRequest({ ...lint, output: long }, 'fix', { branch: 'b' }).message
    expect(msg).toContain('Output:\n')
    expect(msg).toContain(`${'x'.repeat(800)}…`)
    expect(msg).not.toContain('x'.repeat(801))
  })

  it('appends nothing when the output is blank', () => {
    expect(
      handoffRequest({ ...lint, output: '   ' }, 'fix', { branch: 'b' }).message,
    ).not.toContain('Output:')
  })

  it('falls back to a generic branch name when none is known', () => {
    const req2 = handoffRequest(lint, 'fix', { branch: undefined })
    expect(req2.facts[0].value).toBe('the review branch')
    expect(req2.message).toContain('On the review branch, lint failed')
  })
})

describe('handoffRequest — setup', () => {
  const req = handoffRequest(lint, 'setup', { branch: 'agent/abc' })

  it('uses the setup verb on the button and the confirm', () => {
    expect(req.buttonLabel).toBe('Ask the agent to add a lint config')
    expect(req.title).toBe('Ask the agent to add a lint config?')
  })

  it('says every future run benefits', () => {
    expect(req.facts.find((f) => f.label === 'From now on')?.value).toMatch(/every future run/)
  })

  it('asks for the config, one run on the branch, and the filed result', () => {
    expect(req.message).toBe(
      'This project has no lint. Please add a lint config so it can run from now on, run it once on the review branch agent/abc, and file the result as evidence on this run.',
    )
  })
})

describe('handoffRequest — capture', () => {
  const req = handoffRequest(walkthrough, 'capture', { branch: 'agent/abc' })

  it('describes what is produced and why it needs an agent', () => {
    expect(req.facts[0]).toEqual({
      label: 'Produces',
      value: 'a walkthrough recording, filed as evidence on this run',
    })
    expect(req.facts[1].value).toMatch(/agent work, not a command/)
  })

  it('says the existing evidence stays valid — no commits', () => {
    expect(req.facts.find((f) => f.label === "Won't")?.value).toBe('change any code')
    expect(req.caveat).toMatch(/stays valid/)
  })

  it('asks for the capture on the branch', () => {
    expect(req.message).toBe(
      'Please record a walkthrough for the review branch agent/abc and file it as evidence on this run.',
    )
  })

  it('asks a DEVICE capture to drive the app, never to set an emulator up', () => {
    // The capture branch promises "Won't change any code", so reusing the setup
    // verb made the request contradict its own confirm.
    const device = handoffRequest(
      {
        id: 'device' as const,
        label: 'Device',
        noun: 'a run on a device',
        setupVerb: 'set up an emulator',
        detail: 'Not captured on this branch.',
        output: undefined,
      },
      'capture',
      { branch: 'agent/abc' },
    )
    expect(device.buttonLabel).toBe('Ask the agent to drive the app on a device')
    expect(device.message).not.toMatch(/set up an emulator/)
    expect(device.message).toMatch(/drive the app on a device/)
  })
})

describe('handoffRequest — setup copy', () => {
  it('names an article-free noun, so the sentence is grammatical', () => {
    const types = handoffRequest(
      {
        id: 'types' as const,
        label: 'Types',
        noun: 'the typecheck',
        setupVerb: 'wire up a typecheck',
        detail: 'This project has no typecheck.',
        output: undefined,
      },
      'setup',
      { branch: 'agent/abc' },
    )
    expect(types.message).toMatch(/^This project has no typecheck\./)
    expect(types.message).not.toMatch(/no the typecheck/)
  })
})
