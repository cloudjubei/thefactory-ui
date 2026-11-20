import { describe, expect, it } from 'vitest'
import { appNoteLabel, appNoteMarkup, appNoteOfPick, parseAppElementPick } from './appNotes'
import type { AppNote } from './appNotesTypes'

describe('App element picks', () => {
  it('preserves a selector, inert HTML and finite app viewport rectangle', () => {
    expect(
      parseAppElementPick({
        selector: '#save',
        outerHtml: '<button id="save">Save</button>',
        rect: { x: 1, y: 2, width: 3, height: 4 },
      }),
    ).toEqual({
      selector: '#save',
      outerHtml: '<button id="save">Save</button>',
      rect: { x: 1, y: 2, width: 3, height: 4 },
    })
  })
  it('rejects malformed picks and caps the snippet', () => {
    for (const value of [
      null,
      {},
      { selector: '', outerHtml: '<p />' },
      { selector: '#x', outerHtml: 3 },
    ])
      expect(parseAppElementPick(value)).toBeNull()
    expect(
      parseAppElementPick({
        selector: '#x',
        outerHtml: 'x'.repeat(21_000),
        rect: { x: NaN, y: 0, width: 1, height: 1 },
      }),
    ).toEqual({ selector: '#x', outerHtml: 'x'.repeat(20_000) })
  })
  it('drops an empty rectangle, which a note may not carry', () => {
    for (const rect of [
      { x: 0, y: 0, width: 0, height: 4 },
      { x: 0, y: 0, width: 4, height: 0 },
    ])
      expect(parseAppElementPick({ selector: '#x', outerHtml: '<p />', rect })).toEqual({
        selector: '#x',
        outerHtml: '<p />',
      })
  })
})

describe('appNoteOfPick', () => {
  it('makes one note with one element target in the app viewport, on the deep link view', () => {
    expect(
      appNoteOfPick(
        'n1',
        'p1',
        { selector: '#save', outerHtml: '<b />', rect: { x: 1, y: 2, width: 3, height: 4 } },
        { view: 'Settings', params: { tab: 'plan' } },
      ),
    ).toEqual({
      id: 'n1',
      projectId: 'p1',
      view: 'Settings',
      params: { tab: 'plan' },
      comment: '',
      targets: [
        {
          kind: 'element',
          selector: '#save',
          outerHtml: '<b />',
          rect: { x: 1, y: 2, width: 3, height: 4, space: 'app-viewport' },
        },
      ],
    })
  })
  it('leaves out the view and rectangle it was not given', () => {
    const note = appNoteOfPick('n1', 'p1', { selector: '#x', outerHtml: '<p />' }, null)
    expect(note).toEqual({
      id: 'n1',
      projectId: 'p1',
      comment: '',
      targets: [{ kind: 'element', selector: '#x', outerHtml: '<p />' }],
    })
    expect(note).not.toHaveProperty('view')
    expect(note.targets[0]).not.toHaveProperty('rect')
  })
})

describe('appNoteLabel and appNoteMarkup', () => {
  const note = (targets: AppNote['targets']): AppNote => ({
    id: 'n',
    projectId: 'p',
    comment: '',
    targets,
  })
  it('names one element by its selector and shows its markup', () => {
    const one = note([{ kind: 'element', selector: '#a', outerHtml: '<p id="a" />' }])
    expect(appNoteLabel(one)).toBe('#a')
    expect(appNoteMarkup(one)).toBe('<p id="a" />')
  })
  it('names every target of a note, areas by their rounded size', () => {
    const many = note([
      { kind: 'element', selector: '#a', outerHtml: '<p id="a" />' },
      { kind: 'area', rect: { x: 0, y: 0, width: 119.6, height: 40.2, space: 'app-viewport' } },
      { kind: 'element', selector: '#b', outerHtml: '<p id="b" />' },
    ])
    expect(appNoteLabel(many)).toBe('#a, Area 120 × 40, #b')
    expect(appNoteMarkup(many)).toBe('<p id="a" />\n<p id="b" />')
  })
})
