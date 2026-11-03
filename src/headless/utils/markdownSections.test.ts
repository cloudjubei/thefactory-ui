import { describe, expect, it } from 'vitest'

import { markdownSectionKeys, markdownSections, markdownSummaryLine } from './markdownSections'

describe('markdownSections', () => {
  it('keeps text with no headings as the intro alone', () => {
    expect(markdownSections('One paragraph.\n\n- a\n- b')).toEqual({
      intro: 'One paragraph.\n\n- a\n- b',
      sections: [],
    })
  })

  it('splits at the shallowest heading, the text before it the intro', () => {
    const { intro, sections } = markdownSections(
      '**Status:** in discussion.\n\n## How it works\n\nAPI chats limit context.\n\n## What is wrong\n\n1. No limit.\n2. No tracking.',
    )
    expect(intro).toBe('**Status:** in discussion.')
    expect(sections.map((s) => [s.key, s.title, s.body])).toEqual([
      ['0', 'How it works', 'API chats limit context.'],
      ['1', 'What is wrong', '1. No limit.\n2. No tracking.'],
    ])
  })

  it('takes a document of top-level headings the same way', () => {
    const { intro, sections } = markdownSections('# Goal\nShip it.\n# Risks\nNone.')
    expect(intro).toBe('')
    expect(sections.map((s) => s.title)).toEqual(['Goal', 'Risks'])
  })

  it('folds the next level down into subsections, the text before them the body', () => {
    const [update] = markdownSections(
      '## Update\n\nWhat changed.\n\n### Built\n- a\n- b\n\n### Why\nBecause.',
    ).sections
    expect(update?.body).toBe('What changed.')
    expect(update?.subsections.map((s) => [s.key, s.title, s.body])).toEqual([
      ['0.0', 'Built', '- a\n- b'],
      ['0.1', 'Why', 'Because.'],
    ])
  })

  it('keeps headings deeper than a subsection inside its body', () => {
    const [sec] = markdownSections('## A\n### B\nText.\n#### C\nMore.').sections
    expect(sec?.subsections[0]?.body).toBe('Text.\n#### C\nMore.')
    expect(sec?.subsections[0]?.subsections).toEqual([])
  })

  it('ignores heading-like lines inside fenced code', () => {
    const { sections } = markdownSections(
      '## Setup\n```sh\n## not a heading\n# nor this\n```\n~~~\n## nor this\n~~~\n## Next\nGo.',
    )
    expect(sections.map((s) => s.title)).toEqual(['Setup', 'Next'])
    expect(sections[0]?.body).toContain('## not a heading')
  })

  it('closes a fence only with its own marker', () => {
    const { sections } = markdownSections('## A\n```\n~~~\n## inside\n```\n## B')
    expect(sections.map((s) => s.title)).toEqual(['A', 'B'])
  })

  it('leaves a deeper heading before the first top-level one in the intro', () => {
    const { intro, sections } = markdownSections('### Note\nRead first.\n## Body\nText.')
    expect(intro).toBe('### Note\nRead first.')
    expect(sections.map((s) => s.title)).toEqual(['Body'])
  })

  it('reads a heading without its closing hashes or inline marks', () => {
    const [sec] = markdownSections('## **Bold** `code` title ##\nText.').sections
    expect(sec?.title).toBe('Bold code title')
  })

  it('reads Windows line endings', () => {
    const { intro, sections } = markdownSections('Intro.\r\n## One\r\nText.\r\n')
    expect(intro).toBe('Intro.')
    expect(sections[0]?.body).toBe('Text.')
  })

  it('sums a section up by its first line of text, without list marks or markdown', () => {
    const [sec] = markdownSections(
      '## Wrong\n\n```\ncode first\n```\n1. **The replay has no size limit.** A long chat overflows.',
    ).sections
    expect(sec?.summary).toBe('The replay has no size limit. A long chat overflows.')
  })

  it('sums up a section with no text of its own by its subsections', () => {
    const [sec] = markdownSections('## Update\n### Built\nx\n### Why it matters\ny').sections
    expect(sec?.summary).toBe('Built · Why it matters')
  })

  it('counts the top-level points of a list, not nested or fenced ones', () => {
    const [sec] = markdownSections(
      '## Plan\nIntro.\n- one\n  - nested\n- two\n* three\n10) four\n```\n- fenced\n```',
    ).sections
    expect(sec?.meta).toBe('4 points')
  })

  it('names the subsections count over the points', () => {
    const [sec] = markdownSections('## A\n- x\n- y\n### B\nb\n### C\nc').sections
    expect(sec?.meta).toBe('2 subsections')
  })

  it('says nothing for a single point and names one subsection in the singular', () => {
    const { sections } = markdownSections('## A\n- only\n## B\n### C\nc')
    expect(sections[0]?.meta).toBeUndefined()
    expect(sections[1]?.meta).toBe('1 subsection')
  })
})

describe('markdownSummaryLine', () => {
  it('reads the first line of text, cut to one line', () => {
    expect(markdownSummaryLine('\n> **Quoted** [link](https://x.y) text\nsecond', 20)).toBe(
      'Quoted link text',
    )
  })

  it('skips tables and rules', () => {
    expect(markdownSummaryLine('---\n| a | b |\n|---|---|\nAfter the table.')).toBe(
      'After the table.',
    )
  })

  it('is empty for text with nothing to read', () => {
    expect(markdownSummaryLine('```\nonly code\n```')).toBe('')
  })
})

describe('markdownSectionKeys', () => {
  it('lists every section and subsection key in order', () => {
    const { sections } = markdownSections('## A\n### A1\n### A2\n## B')
    expect(markdownSectionKeys(sections)).toEqual(['0', '0.0', '0.1', '1'])
  })
})
