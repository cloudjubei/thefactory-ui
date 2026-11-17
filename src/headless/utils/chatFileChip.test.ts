import { describe, expect, it } from 'vitest'
import { chatFileKind, chatFileStem } from './chatFileChip'

describe('chatFileKind', () => {
  it('names a known type in words', () => {
    expect(chatFileKind('.factory/attachments/c-1/2e3f4a5b6c7d-deployment-rules.pdf')).toEqual({
      short: 'PDF',
      long: 'PDF document',
    })
    expect(chatFileKind('notes/plan.MD')).toEqual({ short: 'Markdown', long: 'Markdown' })
    expect(chatFileKind('army-roster.csv')).toEqual({ short: 'CSV', long: 'Spreadsheet' })
  })

  it('names an unknown type by its extension', () => {
    expect(chatFileKind('seed.dat')).toEqual({ short: 'DAT', long: 'DAT file' })
  })

  it('calls a file without an extension a file', () => {
    expect(chatFileKind('Makefile')).toEqual({ short: 'File', long: 'File' })
    expect(chatFileKind('archive.')).toEqual({ short: 'File', long: 'File' })
    expect(chatFileKind('.factory/attachments/c-1/notes')).toEqual({ short: 'File', long: 'File' })
  })
})

describe('chatFileStem', () => {
  it('takes the extension off a name', () => {
    expect(chatFileStem('deployment-rules.pdf')).toBe('deployment-rules')
    expect(chatFileStem('roster.v2.csv')).toBe('roster.v2')
  })

  it('keeps a name without an extension whole', () => {
    expect(chatFileStem('Makefile')).toBe('Makefile')
    expect(chatFileStem('.env')).toBe('.env')
    expect(chatFileStem('archive.')).toBe('archive.')
  })
})
