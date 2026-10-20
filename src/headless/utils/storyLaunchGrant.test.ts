import { describe, expect, it, vi } from 'vitest'
import { isStartFeatureWorkGrant, startFeatureWorkGrantSummary } from './approvalGrant'
import { storyLaunchGrant } from './storyLaunchGrant'

const make = (featureIds?: string[]) => {
  const onLaunch = vi.fn(async () => undefined)
  const onCancel = vi.fn()
  const grant = storyLaunchGrant({
    storyId: 's1',
    ...(featureIds ? { featureIds } : {}),
    chatRunner: 'cli',
    onLaunch,
    onCancel,
  })
  return { grant, onLaunch, onCancel }
}

describe('storyLaunchGrant', () => {
  it('is the same launch ask an agent’s startFeatureWork raises, for a process run', () => {
    const { grant } = make()
    expect(isStartFeatureWorkGrant(grant)).toBe(true)
    expect(startFeatureWorkGrantSummary(grant)).toMatchObject({ storyId: 's1', mode: 'process' })
    expect(grant.chatRunner).toBe('cli')
  })

  it('names only the features it launches', () => {
    expect(startFeatureWorkGrantSummary(make(['f2']).grant).featureIds).toEqual(['f2'])
    expect(startFeatureWorkGrantSummary(make([]).grant)).not.toHaveProperty('featureIds')
  })

  it('launches with the card’s picks when approved', async () => {
    const { grant, onLaunch, onCancel } = make()
    await grant.decide('once', { baseBranch: 'dev' })
    expect(onLaunch).toHaveBeenCalledWith({ baseBranch: 'dev' })
    await grant.decide('once')
    expect(onLaunch).toHaveBeenLastCalledWith({})
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('runs on the agent the person’s chats run on unless the card picks another', async () => {
    const onLaunch = vi.fn(async () => undefined)
    const grant = storyLaunchGrant({
      storyId: 's1',
      chatRunner: 'cli',
      agent: { runner: 'cli', cliTool: 'codex', cliModel: 'gpt-5', cliCredentialId: 'c1' },
      onLaunch,
      onCancel: vi.fn(),
    })
    expect(startFeatureWorkGrantSummary(grant)).toMatchObject({
      storyId: 's1',
      mode: 'process',
      runner: 'cli',
      cliTool: 'codex',
      cliModel: 'gpt-5',
      cliCredentialId: 'c1',
    })
    await grant.decide('once', { baseBranch: 'dev' })
    expect(onLaunch).toHaveBeenLastCalledWith({
      runner: 'cli',
      cliTool: 'codex',
      cliModel: 'gpt-5',
      cliCredentialId: 'c1',
      baseBranch: 'dev',
    })
    await grant.decide('once', { runner: 'api' })
    expect(onLaunch).toHaveBeenLastCalledWith(expect.objectContaining({ runner: 'api' }))
  })

  it('keeps the story and its features over an agent that names others', () => {
    const grant = storyLaunchGrant({
      storyId: 's1',
      featureIds: ['f1'],
      chatRunner: 'api',
      agent: { storyId: 's9', mode: 'chat', featureIds: ['f9'] },
      onLaunch: vi.fn(async () => undefined),
      onCancel: vi.fn(),
    })
    expect(startFeatureWorkGrantSummary(grant)).toMatchObject({
      storyId: 's1',
      mode: 'process',
      featureIds: ['f1'],
    })
  })

  it('closes without launching when denied', async () => {
    const { grant, onLaunch, onCancel } = make()
    await grant.decide('deny')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onLaunch).not.toHaveBeenCalled()
  })

  describe('with its process decided before the card opened', () => {
    const fixed = () => {
      const onLaunch = vi.fn(async () => undefined)
      const grant = storyLaunchGrant({
        storyId: 's1',
        chatRunner: 'cli',
        processId: 'reference-intake',
        onLaunch,
        onCancel: vi.fn(),
      })
      return { grant, onLaunch }
    }

    it('names the process on the card and says it is fixed', () => {
      const { grant } = fixed()
      expect(startFeatureWorkGrantSummary(grant)).toMatchObject({ processId: 'reference-intake' })
      expect(grant.processFixed).toBe(true)
    })

    it('launches that process as a process run, whatever the card sent', async () => {
      const { grant, onLaunch } = fixed()
      await grant.decide('once', { mode: 'chat', processId: 'story-default', cliModel: 'opus' })
      expect(onLaunch).toHaveBeenCalledWith({
        mode: 'process',
        processId: 'reference-intake',
        cliModel: 'opus',
      })
    })

    it('is not fixed when no process was decided', () => {
      expect(make().grant).not.toHaveProperty('processFixed')
    })
  })
})
