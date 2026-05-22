import { describe, expect, it } from 'vitest'
import { rawFileUrl } from './rawFileUrl'

describe('rawFileUrl', () => {
  it('builds the raw-bytes endpoint', () => {
    expect(rawFileUrl('https://api.example.com', 'p1', 'src/app.ts')).toBe(
      'https://api.example.com/api/v1/projects/p1/files/raw?path=src%2Fapp.ts',
    )
  })
  it('trims a trailing slash from the base URL', () => {
    expect(rawFileUrl('https://api.example.com/', 'p1', 'a.txt')).toBe(
      'https://api.example.com/api/v1/projects/p1/files/raw?path=a.txt',
    )
  })
  it('encodes project id and path', () => {
    expect(rawFileUrl('http://x', 'p/1', 'a b.png')).toContain('projects/p%2F1/files/raw')
    expect(rawFileUrl('http://x', 'p1', 'a b.png')).toContain('path=a%20b.png')
  })
})
