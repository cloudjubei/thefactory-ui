import { describe, expect, it } from 'vitest'
import {
  launchPlanningAsked,
  launchPlanningChoice,
  launchPlanningLine,
  launchPlanningMetadata,
  launchPlanningOffered,
} from './launchPlanning'

describe('launchPlanningOffered', () => {
  it('offers the toggle when the preview says the run plans first', () => {
    expect(launchPlanningOffered({ planning: true })).toBe(true)
    expect(launchPlanningOffered({ planning: false })).toBe(false)
    expect(launchPlanningOffered({})).toBe(false)
    expect(launchPlanningOffered(undefined)).toBe(false)
  })
})

describe('launchPlanningChoice', () => {
  it('is on until the person turns it off', () => {
    expect(launchPlanningChoice(true, undefined)).toBe(true)
    expect(launchPlanningChoice(true, false)).toBe(false)
    expect(launchPlanningChoice(true, true)).toBe(true)
  })

  it('starts where the agent’s ask put it, the person’s pick over that', () => {
    expect(launchPlanningChoice(true, undefined, false)).toBe(false)
    expect(launchPlanningChoice(true, true, false)).toBe(true)
    expect(launchPlanningChoice(true, undefined, true)).toBe(true)
  })

  it('is nothing while the launch offers none', () => {
    expect(launchPlanningChoice(false, undefined)).toBeUndefined()
    expect(launchPlanningChoice(false, false)).toBeUndefined()
  })
})

describe('launchPlanningAsked', () => {
  it('reads an ask that turned planning off, and nothing else', () => {
    expect(launchPlanningAsked({ planning: false })).toBe(false)
    expect(launchPlanningAsked({ planning: 'false' })).toBe(false)
    expect(launchPlanningAsked({ planning: true })).toBeUndefined()
    expect(launchPlanningAsked({})).toBeUndefined()
    expect(launchPlanningAsked(undefined)).toBeUndefined()
  })
})

describe('launchPlanningMetadata', () => {
  it('sends planning: false when the toggle is off, and nothing otherwise', () => {
    expect(launchPlanningMetadata(false)).toEqual({ planning: false })
    expect(launchPlanningMetadata(true)).toEqual({})
    expect(launchPlanningMetadata(undefined)).toEqual({})
  })

  it('sends planning: true when the person turned planning back on over an ask that had it off', () => {
    expect(launchPlanningMetadata(true, false)).toEqual({ planning: true })
    expect(launchPlanningMetadata(false, false)).toEqual({ planning: false })
  })
})

describe('launchPlanningLine', () => {
  it('says what each side does', () => {
    expect(launchPlanningLine(true)).toMatch(/planner writes/)
    expect(launchPlanningLine(false)).toMatch(/without planning/)
  })
})
