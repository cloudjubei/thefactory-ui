import { describe, expect, it } from 'vitest'
import type { DesignIndex, DesignProposal, DesignSource } from '../api'
import {
  designContentUrl,
  designShownOfEntry,
  designShownOfVersion,
  designSourceFileName,
  designSourceMediaType,
  designVariantName,
  designViewKind,
  findDesignScreen,
  findDesignState,
  referenceDesignOf,
  storageUsageFraction,
} from './design'

const at = { createdAt: 1, updatedAt: 1 }
const blob = (mediaType: string, originalName = 'a.png'): DesignSource => ({
  type: 'blob',
  sha256: 'a'.repeat(64),
  mediaType,
  bytes: 3,
  originalName,
})

const index: DesignIndex = {
  version: 2,
  apps: [{ id: 'a1', name: 'Game', kind: 'product', aliases: [], ...at }],
  screens: [
    {
      id: 's1',
      appId: 'a1',
      name: 'Login',
      kind: 'screen',
      aliases: [],
      uses: [],
      variants: ['Light'],
      ...at,
    },
  ],
  states: [{ id: 'st1', screenId: 's1', name: 'Filled', ...at }],
  versions: [
    {
      id: 'v1',
      stateId: 'st1',
      variant: 'Light',
      number: 2,
      source: blob('image/png'),
      caseQuery: '?mode=a',
      origin: { by: 'person' },
      createdAt: 2,
    },
    {
      id: 'v9',
      stateId: 'gone',
      variant: 'Dark',
      number: 1,
      source: blob('image/png'),
      origin: { by: 'person' },
      createdAt: 2,
    },
  ],
  proposals: [],
  tidyPlans: [],
}

describe('design', () => {
  it('gives the references the apps, screens and states by id and name', () => {
    expect(referenceDesignOf(index)).toEqual({
      apps: [{ id: 'a1', name: 'Game' }],
      screens: [{ id: 's1', appId: 'a1', name: 'Login' }],
      states: [{ id: 'st1', screenId: 's1', name: 'Filled' }],
    })
  })

  it('finds a screen and a state with what they belong to', () => {
    expect(findDesignScreen(index, 's1')).toMatchObject({ app: { id: 'a1' }, screen: { id: 's1' } })
    expect(findDesignScreen(index, 'nope')).toBeUndefined()
    expect(findDesignState(index, 'st1')).toMatchObject({
      app: { id: 'a1' },
      screen: { id: 's1' },
      state: { id: 'st1' },
    })
    expect(findDesignState(index, 'nope')).toBeUndefined()
  })

  it('shows a version named by where it is, and one whose state is gone by its variant alone', () => {
    expect(designShownOfVersion(index, index.versions[0]!)).toEqual({
      ref: { versionId: 'v1' },
      source: blob('image/png'),
      caseQuery: '?mode=a',
      name: 'Login › Filled · Light · v2',
    })
    expect(designShownOfVersion(index, index.versions[1]!).name).toBe('Dark · v1')
  })

  it('shows a proposal’s image by its proposal', () => {
    const proposal = { id: 'p', title: 'Faction cards' } as DesignProposal
    const entry = {
      id: 'e',
      variant: 'Phone',
      source: blob('image/png'),
      target: {},
      links: [],
      pieces: [],
    }
    expect(designShownOfEntry(proposal, entry, 'Login')).toEqual({
      ref: { proposalId: 'p', entryId: 'e' },
      source: blob('image/png'),
      name: 'Login · Phone — Faction cards',
    })
    expect(designShownOfEntry(proposal, { ...entry, caseQuery: '?x=1' }).name).toBe(
      'Phone — Faction cards',
    )
    expect(designShownOfEntry(proposal, { ...entry, caseQuery: '?x=1' }).caseQuery).toBe('?x=1')
  })

  it('reads a build key as the platform and the app or build it names', () => {
    expect(designVariantName('web:app:.')).toBe('Web app')
    expect(designVariantName('web:app:')).toBe('Web app')
    expect(designVariantName('web:app:./')).toBe('Web app')
    expect(designVariantName('web:app:packages/site/')).toBe('Web app · packages/site')
    expect(designVariantName('web:vite')).toBe('Web · vite')
    expect(designVariantName('android:app:onsite/debug')).toBe('Android · onsite/debug')
    expect(designVariantName('android:wear:debug')).toBe('Android · wear · debug')
    expect(designVariantName('ios:Covision/DevDebug')).toBe('iOS · Covision/DevDebug')
  })

  it('reads any other variant as it is', () => {
    for (const v of ['Desktop · Visual', 'Default', '', 'web', 'android:app', 'ios:', 'Web: app'])
      expect(designVariantName(v)).toBe(v)
  })

  it('names images filed under a build key by the app they show', () => {
    const version = { ...index.versions[1]!, variant: 'web:app:.' }
    expect(designShownOfVersion(index, version).name).toBe('Web app · v1')
    const proposal = { id: 'p', title: 'Faction cards' } as DesignProposal
    const entry = {
      id: 'e',
      variant: 'ios:Game/Debug',
      source: blob('image/png'),
      target: {},
      links: [],
      pieces: [],
    }
    expect(designShownOfEntry(proposal, entry).name).toBe('iOS · Game/Debug — Faction cards')
  })

  it('serves a version or an entry, with the view token and a case’s address', () => {
    expect(designContentUrl('http://h/', 'p 1', { versionId: 'v/1' })).toBe(
      'http://h/api/v1/projects/p%201/design/versions/v%2F1/content',
    )
    expect(
      designContentUrl(
        'http://h',
        'p1',
        { proposalId: 'pr', entryId: 'e' },
        { viewToken: 't', caseQuery: '?mode=dark&pack=game' },
      ),
    ).toBe(
      'http://h/api/v1/projects/p1/design/proposals/pr/entries/e/content?mode=dark&pack=game&viewToken=t',
    )
    expect(designContentUrl('', 'p1', { versionId: 'v' }, { caseQuery: 'a=1' })).toBe(
      '/api/v1/projects/p1/design/versions/v/content?a=1',
    )
  })

  it('reads a source’s media type and how a viewer shows it', () => {
    expect(designSourceMediaType({ type: 'link', url: 'https://x' })).toBeUndefined()
    expect(designSourceMediaType({ type: 'project-file', path: 'd/a.html' })).toBe('text/html')
    const kinds: Array<[DesignSource, string]> = [
      [{ type: 'link', url: 'https://x' }, 'link'],
      [blob('text/html'), 'html'],
      [blob('image/svg+xml'), 'html'],
      [blob('application/pdf'), 'pdf'],
      [blob('image/png'), 'image'],
      [blob('image/vnd.adobe.photoshop'), 'file'],
      [blob('video/mp4'), 'video'],
      [blob('text/markdown'), 'text'],
      [blob('application/json'), 'text'],
      [blob('application/octet-stream'), 'file'],
    ]
    for (const [source, kind] of kinds) expect(designViewKind(source)).toBe(kind)
  })

  it('names the file a design was made from', () => {
    expect(designSourceFileName(blob('image/png', 'mock.png'))).toBe('mock.png')
    expect(designSourceFileName({ type: 'project-file', path: 'docs/a/b.pdf' })).toBe('b.pdf')
    expect(designSourceFileName({ type: 'link', url: 'https://figma.com/x' })).toBe('figma.com/x')
  })

  it('says how far the total is toward the threshold', () => {
    expect(storageUsageFraction({ totalBytes: 5, thresholdBytes: 10, over: false })).toBe(0.5)
    expect(storageUsageFraction({ totalBytes: 5, thresholdBytes: 0, over: true })).toBe(1)
  })
})
