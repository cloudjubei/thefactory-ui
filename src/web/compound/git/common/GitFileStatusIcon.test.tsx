import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import * as webIcons from '../../../icons'
import * as nativeIcons from '../../../../native/icons'
import NativeGitFileStatusIcon from '../../../../native/compound/git/GitFileStatusIcon'
import GitFileStatusIcon from './GitFileStatusIcon'

vi.mock('../../../../native/icons', () => ({
  IconFileAdded: () => null,
  IconFileModified: () => null,
  IconFileDeleted: () => null,
  IconFileRenamed: () => null,
  IconWarningTriangle: () => null,
}))

const CASES = [
  ['A', 'IconFileAdded'],
  ['M', 'IconFileModified'],
  ['D', 'IconFileDeleted'],
  ['R', 'IconFileRenamed'],
  [undefined, 'IconFileModified'],
  ['?', 'IconFileModified'],
] as const

describe('GitFileStatusIcon peers', () => {
  it.each(CASES)('dispatches %s to %s on both platforms', (status, icon) => {
    expect(GitFileStatusIcon({ status }).type).toBe(webIcons[icon])
    expect(NativeGitFileStatusIcon({ status }).type).toBe(nativeIcons[icon])
  })

  it('keeps conflict precedence over renamed and forwards size props', () => {
    expect(GitFileStatusIcon({ status: 'R', isConflicted: true }).type).toBe(
      webIcons.IconWarningTriangle,
    )
    expect(NativeGitFileStatusIcon({ status: 'R', isConflicted: true }).type).toBe(
      nativeIcons.IconWarningTriangle,
    )
    expect(GitFileStatusIcon({ status: 'R', className: 'h-4 w-4' }).props.className).toBe('h-4 w-4')
    expect(NativeGitFileStatusIcon({ status: 'R', size: 16 }).props.size).toBe(16)
  })

  it('gives renamed a different glyph and colour from the other file states', () => {
    const renamed = renderToStaticMarkup(<webIcons.IconFileRenamed />)
    expect(renamed).toContain('viewBox="0 0 24 24"')
    expect(renamed).toContain('stroke-width="2"')
    expect(renamed).toMatch(/<path\b[^>]*\bd="M8 12h8m-4-4 4 4-4 4"[^>]*\bstroke="#3B82F6"/)
    for (const Icon of [
      webIcons.IconFileAdded,
      webIcons.IconFileModified,
      webIcons.IconFileDeleted,
    ]) {
      expect(renderToStaticMarkup(<Icon />)).not.toContain('#3B82F6')
    }
  })
})
