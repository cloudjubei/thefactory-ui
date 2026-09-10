import { describe, expect, it } from 'vitest'

import { parseTestFailures } from './testFailures'

describe('parseTestFailures', () => {
  it('splits the runner\'s "path › name\\nmessage" shape', () => {
    const out = parseTestFailures(
      'src/a.test.ts › maps a family\nexpected: <A> but was: <B>\n\nsrc/b.test.ts › other\nboom',
    )
    expect(out).toEqual([
      { path: 'src/a.test.ts', name: 'maps a family', message: 'expected: <A> but was: <B>' },
      { path: 'src/b.test.ts', name: 'other', message: 'boom' },
    ])
  })

  it('keeps a multi-line assertion message whole', () => {
    const out = parseTestFailures('a.ts › t\nline one\nline two')
    expect(out[0].message).toBe('line one\nline two')
  })

  it('keeps unstructured output rather than dropping it', () => {
    // Output a reviewer cannot see is worse than output that is merely unstructured.
    const out = parseTestFailures('the harness exploded')
    expect(out).toEqual([{ path: '', name: '', message: 'the harness exploded' }])
  })

  it('handles a header with no message', () => {
    expect(parseTestFailures('a.ts › t')).toEqual([{ path: 'a.ts', name: 't', message: '' }])
  })

  it('is empty for absent or blank output', () => {
    expect(parseTestFailures(undefined)).toEqual([])
    expect(parseTestFailures('   ')).toEqual([])
  })
})
