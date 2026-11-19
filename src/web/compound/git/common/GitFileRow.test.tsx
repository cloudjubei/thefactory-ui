import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GitFileRow, { type GitLocalFileEntry } from './GitFileRow'

const noop = () => {}
const render = (file: GitLocalFileEntry) =>
  renderToStaticMarkup(
    <GitFileRow file={file} checked onToggle={noop} onReset={noop} onRemove={noop} />,
  )

describe('GitFileRow rename', () => {
  it('shortens only shared directory segments and exposes both full paths on hover', () => {
    const html = render({
      status: 'R',
      path: 'src/video/benchmark/b.ts',
      oldPath: 'src/video/__fixtures__/a.ts',
      additions: 0,
      deletions: 0,
    })
    expect(html).toContain('title="src/video/__fixtures__/a.ts → src/video/benchmark/b.ts"')
    expect(html).toContain('>__fixtures__/a.ts<')
    expect(html).toContain('>→<')
    expect(html).not.toContain('=&gt;')
    expect(html).not.toMatch(/>[+-]0</)
  })

  it('shows an in-place source basename and retains numstat without a patch', () => {
    const html = render({
      status: 'R',
      path: 'src/new.ts',
      renameFrom: 'src/old.ts',
      additions: 4,
      deletions: 2,
    })
    expect(html).toContain('>old.ts<')
    expect(html).toContain('title="src/old.ts → src/new.ts"')
    expect(html).toContain('>+4<')
    expect(html).toContain('>-2<')
  })

  it('keeps both divergent folders when only part of a segment matches', () => {
    const html = render({ status: 'R', path: 'app2/new.ts', oldPath: 'app1/old.ts' })
    expect(html).toContain('>app1/old.ts<')
  })

  it('does not display a copy as a rename', () => {
    const html = render({ status: 'C', path: 'src/new.ts', oldPath: 'src/old.ts' })
    expect(html).not.toContain('old.ts')
    expect(html).not.toContain('→')
  })
})
