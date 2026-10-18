import { describe, expect, it } from 'vitest'

import { featureKindChipLabel, featureKindOf, featureKindPatch } from './featureKind'
import { FEATURE_KIND_HINTS, FEATURE_KIND_OPTIONS } from './featureKindConstants'

describe('featureKindOf', () => {
  it('reads a feature with no kind as code, and a design feature as design', () => {
    expect(featureKindOf({})).toBe('code')
    expect(featureKindOf({ kind: undefined })).toBe('code')
    expect(featureKindOf({ kind: 'code' })).toBe('code')
    expect(featureKindOf({ kind: 'design' })).toBe('design')
  })
})

describe('featureKindChipLabel', () => {
  it('names a design feature and leaves a code feature unmarked', () => {
    expect(featureKindChipLabel({ kind: 'design' })).toBe('Design')
    expect(featureKindChipLabel({ kind: 'code' })).toBeUndefined()
    expect(featureKindChipLabel({})).toBeUndefined()
  })
})

describe('featureKindPatch', () => {
  it('leaves a new code feature without a kind, so absent stays the default', () => {
    expect(featureKindPatch('code', 'create')).toEqual({})
  })

  it('files a new design feature as design', () => {
    expect(featureKindPatch('design', 'create')).toEqual({ kind: 'design' })
  })

  it('always sends the kind on an edit, so a design feature can be turned back to code', () => {
    expect(featureKindPatch('code', 'edit')).toEqual({ kind: 'code' })
    expect(featureKindPatch('design', 'edit')).toEqual({ kind: 'design' })
  })
})

describe('FEATURE_KIND_OPTIONS', () => {
  it('offers code first, then design, each with a hint', () => {
    expect(FEATURE_KIND_OPTIONS.map((o) => o.value)).toEqual(['code', 'design'])
    for (const o of FEATURE_KIND_OPTIONS) expect(FEATURE_KIND_HINTS[o.value]).toBeTruthy()
  })
})
