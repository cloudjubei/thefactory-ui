import { describe, expect, it } from 'vitest'
import { fileLineParam, fileLocationPath, textLineRange } from './fileLocation'

describe('fileLocationPath', () => {
  it('opens the file, each path segment encoded', () => {
    expect(fileLocationPath('p 1', 'src/a b.ts')).toBe('/projects/p%201/files/src/a%20b.ts')
  })

  it('names the line to open at', () => {
    expect(fileLocationPath('p1', 'a.ts', 12)).toBe('/projects/p1/files/a.ts?line=12')
  })

  it('names no line it cannot open at', () => {
    expect(fileLocationPath('p1', 'a.ts', 0)).toBe('/projects/p1/files/a.ts')
    expect(fileLocationPath('p1', 'a.ts', 2.5)).toBe('/projects/p1/files/a.ts')
  })
})

describe('fileLineParam', () => {
  it('reads a line number', () => {
    expect(fileLineParam('12')).toBe(12)
    expect(fileLineParam(['7', '9'])).toBe(7)
  })

  it.each([
    [undefined],
    [null],
    [''],
    ['0'],
    ['-3'],
    ['1.5'],
    ['12abc'],
    ['abc'],
    ['0x10'],
    ['1e2'],
    [' 12'],
    [[]],
  ])('reads no line from %j', (value) => {
    expect(fileLineParam(value)).toBeUndefined()
  })
})

describe('textLineRange', () => {
  const TEXT = 'first\nsecond line\r\n\nlast'

  it('spans the line without its line break', () => {
    expect(textLineRange(TEXT, 1)).toEqual({ start: 0, end: 5 })
    expect(textLineRange(TEXT, 2)).toEqual({ start: 6, end: 17 })
    expect(textLineRange(TEXT, 3)).toEqual({ start: 19, end: 19 })
    expect(textLineRange(TEXT, 4)).toEqual({ start: 20, end: 24 })
  })

  it('takes a line past the end as the last one', () => {
    expect(textLineRange(TEXT, 40)).toEqual({ start: 20, end: 24 })
    expect(textLineRange('', 3)).toEqual({ start: 0, end: 0 })
  })
})
