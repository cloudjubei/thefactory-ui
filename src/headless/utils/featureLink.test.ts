import { describe, it, expect } from 'vitest'
import { linkedFeatureStep } from './featureLink'
import { FEATURE_LINK_PARAM } from './featureLinkConstants'

describe('linkedFeatureStep', () => {
  const login = { id: 'f1', title: 'Login' }
  const logout = { id: 'f2', title: 'Logout' }
  const story = { features: [login, logout] }

  it('does nothing when the page was opened without a feature', () => {
    expect(linkedFeatureStep(story, undefined, undefined)).toEqual({ type: 'none' })
    expect(linkedFeatureStep(story, null, 'f1')).toEqual({ type: 'none' })
    expect(linkedFeatureStep(null, '', undefined)).toEqual({ type: 'none' })
  })

  it('does nothing again for the feature the link already opened', () => {
    expect(linkedFeatureStep(story, 'f2', 'f2')).toEqual({ type: 'none' })
    expect(linkedFeatureStep(undefined, 'f2', 'f2')).toEqual({ type: 'none' })
  })

  it('waits while the story is not in yet', () => {
    expect(linkedFeatureStep(null, 'f1', undefined)).toEqual({ type: 'loading' })
    expect(linkedFeatureStep(undefined, 'f1', 'f9')).toEqual({ type: 'loading' })
  })

  it('opens the feature the link names, the very object the story holds', () => {
    const step = linkedFeatureStep(story, 'f2', undefined)
    expect(step).toEqual({ type: 'open', feature: logout })
    expect(step.type === 'open' && step.feature).toBe(logout)
    expect(linkedFeatureStep(story, 'f1', 'f2')).toEqual({ type: 'open', feature: login })
  })

  it('says the feature is gone when the story has no such feature', () => {
    expect(linkedFeatureStep(story, 'f9', undefined)).toEqual({ type: 'missing' })
    expect(linkedFeatureStep({ features: [] }, 'f1', undefined)).toEqual({ type: 'missing' })
  })

  it('reads the link from the feature query parameter', () => {
    expect(FEATURE_LINK_PARAM).toBe('feature')
  })
})
