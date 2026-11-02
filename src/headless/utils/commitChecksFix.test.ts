import { describe, expect, it } from 'vitest'

import { commitChecksFixBrief } from './commitChecksFix'

describe('commitChecksFixBrief', () => {
  it('hands the agent what the checks printed, the staged files and the commit it was for', () => {
    const brief = commitChecksFixBrief({
      output: '\u001b[31m✖ eslint\u001b[39m\nsrc/a.ts\n  860:9  error  prefer-const',
      stagedFiles: ['src/a.ts', 'src/b.ts'],
      message: 'Project group stories',
    })

    expect(brief).toContain('Commit message: Project group stories')
    expect(brief).toContain('- src/a.ts\n- src/b.ts')
    expect(brief).toContain('```\n✖ eslint\nsrc/a.ts\n  860:9  error  prefer-const\n```')
    expect(brief).not.toContain('\u001b')
    expect(brief).toMatch(/do not commit/i)
  })

  it('leaves out what it was not given', () => {
    const brief = commitChecksFixBrief({ output: 'failed', stagedFiles: [], message: '  ' })

    expect(brief).not.toContain('Commit message:')
    expect(brief).not.toContain('Staged files:')
    expect(brief).toContain('```\nfailed\n```')
  })

  it('keeps a fence inside the output from closing the block early', () => {
    const brief = commitChecksFixBrief({ output: 'a\n```\nb', stagedFiles: [], message: '' })

    expect(brief).toContain('````\na\n```\nb\n````')
  })
})
