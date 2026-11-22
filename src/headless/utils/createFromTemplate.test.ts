import { describe, expect, it } from 'vitest'
import {
  forkProgressLabel,
  isForkProgressTerminal,
  parseTemplateForkProgress,
  projectIdAvailability,
  sanitizeProjectId,
  suggestProjectIdFromName,
  templateDifficultyLabel,
} from './createFromTemplate'

describe('sanitizeProjectId', () => {
  it('lowercases and keeps slug characters', () => {
    expect(sanitizeProjectId('My Investments')).toBe('my-investments')
  })

  it('collapses invalid runs and trims hyphens', () => {
    expect(sanitizeProjectId('--Hello!!World--')).toBe('hello-world')
  })

  it('caps length at 64', () => {
    expect(sanitizeProjectId('a'.repeat(80))).toHaveLength(64)
  })
})

describe('suggestProjectIdFromName', () => {
  it('prefers the name slug', () => {
    expect(suggestProjectIdFromName('Car Finder', 'car-finder')).toBe('car-finder')
  })

  it('falls back to the template id when the name yields nothing', () => {
    expect(suggestProjectIdFromName('!!!', 'plastic-free')).toBe('plastic-free')
  })
})

describe('projectIdAvailability', () => {
  it('reports empty, available and taken', () => {
    expect(projectIdAvailability('  ', ['a'])).toBe('empty')
    expect(projectIdAvailability('mine', ['a'])).toBe('available')
    expect(projectIdAvailability('a', ['a'])).toBe('taken')
  })
})

describe('templateDifficultyLabel', () => {
  it('maps known difficulties', () => {
    expect(templateDifficultyLabel('beginner')).toBe('Beginner')
    expect(templateDifficultyLabel('intermediate')).toBe('Intermediate')
    expect(templateDifficultyLabel(undefined)).toBeUndefined()
  })
})

describe('parseTemplateForkProgress', () => {
  it('accepts a well-formed progress event', () => {
    expect(
      parseTemplateForkProgress({
        jobId: 'j1',
        templateId: 't1',
        projectId: 'p1',
        phase: 'cloning',
        message: 'Cloning…',
      }),
    ).toEqual({
      jobId: 'j1',
      templateId: 't1',
      projectId: 'p1',
      phase: 'cloning',
      message: 'Cloning…',
    })
  })

  it('rejects incomplete payloads', () => {
    expect(parseTemplateForkProgress({ jobId: 'j1', phase: 'done' })).toBeUndefined()
    expect(parseTemplateForkProgress(null)).toBeUndefined()
  })
})

describe('forkProgressLabel / isForkProgressTerminal', () => {
  it('prefers message, then phase label', () => {
    expect(
      forkProgressLabel({
        jobId: 'j',
        templateId: 't',
        projectId: 'p',
        phase: 'installing',
        message: 'npm install',
      }),
    ).toBe('npm install')
    expect(
      forkProgressLabel({
        jobId: 'j',
        templateId: 't',
        projectId: 'p',
        phase: 'installing',
      }),
    ).toMatch(/install/i)
  })

  it('surfaces error text on failure', () => {
    expect(
      forkProgressLabel({
        jobId: 'j',
        templateId: 't',
        projectId: 'p',
        phase: 'error',
        error: 'clone failed',
      }),
    ).toBe('clone failed')
  })

  it('marks done and error as terminal', () => {
    expect(
      isForkProgressTerminal({
        jobId: 'j',
        templateId: 't',
        projectId: 'p',
        phase: 'done',
      }),
    ).toBe(true)
    expect(
      isForkProgressTerminal({
        jobId: 'j',
        templateId: 't',
        projectId: 'p',
        phase: 'cloning',
      }),
    ).toBe(false)
  })
})
