import { describe, it, expect } from 'vitest'
import { classifyFileByExtension } from './filePaneKind.js'

describe('classifyFileByExtension', () => {
  it('returns binary for null/undefined/empty', () => {
    expect(classifyFileByExtension(null)).toBe('binary')
    expect(classifyFileByExtension(undefined)).toBe('binary')
    expect(classifyFileByExtension('')).toBe('binary')
  })

  it('classifies markdown by extension', () => {
    expect(classifyFileByExtension('README.md')).toBe('markdown')
    expect(classifyFileByExtension('docs/intro.MDX')).toBe('markdown')
  })

  it('classifies html, image, and pdf', () => {
    expect(classifyFileByExtension('index.html')).toBe('html')
    expect(classifyFileByExtension('logo.PNG')).toBe('image')
    expect(classifyFileByExtension('spec.pdf')).toBe('pdf')
  })

  it('classifies known text extensions', () => {
    expect(classifyFileByExtension('src/foo.ts')).toBe('text')
    expect(classifyFileByExtension('config.yaml')).toBe('text')
    expect(classifyFileByExtension('package-lock.json')).toBe('text')
  })

  it('classifies known dotfiles (leading-dot config files) as text', () => {
    expect(classifyFileByExtension('.gitignore')).toBe('text')
    expect(classifyFileByExtension('.editorconfig')).toBe('text')
  })

  it('defaults extensionless files to text (LICENSE, Makefile, Dockerfile)', () => {
    expect(classifyFileByExtension('LICENSE')).toBe('text')
    expect(classifyFileByExtension('Makefile')).toBe('text')
    expect(classifyFileByExtension('Dockerfile')).toBe('text')
    expect(classifyFileByExtension('CHANGELOG')).toBe('text')
    expect(classifyFileByExtension('path/to/LICENSE')).toBe('text')
  })

  it('extracts the extension from the basename, not from path-internal dots', () => {
    // Without basename-aware parsing the dot in `v1.2.3` gets picked up as
    // the extension separator, breaking classification for files inside
    // versioned directories.
    expect(classifyFileByExtension('vendor/v1.2.3/LICENSE')).toBe('text')
    expect(classifyFileByExtension('node_modules/foo.bar/index.ts')).toBe('text')
  })

  it('keeps unknown extensions as binary so true binaries are not mis-rendered', () => {
    // A `.bin` / `.exe` / arbitrary unknown extension should still default to
    // binary — only EXTENSIONLESS files trip the text-fallback.
    expect(classifyFileByExtension('bundle.exe')).toBe('binary')
    expect(classifyFileByExtension('file.unknown-ext')).toBe('binary')
  })
})
