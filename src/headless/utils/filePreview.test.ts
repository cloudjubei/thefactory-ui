import { describe, expect, it } from 'vitest'
import type { ReferenceDescription } from 'thefactory-tools/types'
import {
  filePreviewCaption,
  filePreviewFailure,
  filePreviewInfoOf,
  filePreviewInfoRows,
  filePreviewInitialPane,
  filePreviewMediaType,
  filePreviewName,
  filePreviewPanes,
  filePreviewSize,
  filePreviewSource,
  filePreviewTarget,
  ownFileDescription,
} from './filePreview'
import { FILE_PREVIEW_COPY } from './filePreviewConstants'
import type { FilePreviewContent, FilePreviewTarget } from './filePreviewTypes'
import { formatFileDate } from './path'

const FILE: ReferenceDescription = {
  kind: 'file',
  label: 'Compass BE docs/ZNR-780_PROPOSAL.md',
  projectName: 'Compass BE',
  link: { kind: 'file', projectId: 'compass-be', path: 'docs/ZNR-780_PROPOSAL.md' },
}

const TARGET: FilePreviewTarget = { projectId: 'compass-be', path: 'docs/ZNR-780_PROPOSAL.md' }

function axiosError(status: number | undefined, error?: string) {
  return {
    isAxiosError: true,
    ...(status === undefined ? {} : { response: { status, data: error ? { error } : {} } }),
  }
}

describe('filePreviewTarget', () => {
  it('previews a file in another project by that project, its name for the caption', () => {
    expect(filePreviewTarget(FILE)).toEqual({ ...TARGET, projectName: 'Compass BE' })
  })

  it('previews a file of the project on screen with no project name', () => {
    expect(
      filePreviewTarget({
        kind: 'file',
        label: 'src/app.ts',
        link: { kind: 'file', projectId: 'p', path: 'src/app.ts' },
      }),
    ).toEqual({ projectId: 'p', path: 'src/app.ts' })
  })

  it('offers no preview of a folder, whether its label or its path says so', () => {
    expect(filePreviewTarget({ ...FILE, label: 'Compass BE docs/' })).toBeUndefined()
    expect(
      filePreviewTarget({
        ...FILE,
        link: { kind: 'file', projectId: 'compass-be', path: 'docs/' },
      }),
    ).toBeUndefined()
  })

  it('offers no preview of what is gone, still being looked up, or not a file', () => {
    expect(filePreviewTarget({ ...FILE, missing: true })).toBeUndefined()
    expect(filePreviewTarget({ ...FILE, loading: true })).toBeUndefined()
    expect(filePreviewTarget({ kind: 'file', label: 'docs/a.md' })).toBeUndefined()
    expect(
      filePreviewTarget({
        kind: 'story',
        label: '#7',
        link: { kind: 'story', projectId: 'p', storyId: 's' },
      }),
    ).toBeUndefined()
    expect(
      filePreviewTarget({
        kind: 'attachment',
        label: 'shot.png',
        link: { kind: 'file', projectId: 'p', path: 'shot.png' },
      }),
    ).toBeUndefined()
  })
})

describe('filePreviewSource', () => {
  it('reads text kinds as text, images and PDFs as bytes, and nothing else', () => {
    expect(filePreviewSource('README.md')).toBe('text')
    expect(filePreviewSource('index.html')).toBe('text')
    expect(filePreviewSource('src/app.ts')).toBe('text')
    expect(filePreviewSource('LICENSE')).toBe('text')
    expect(filePreviewSource('shot.PNG')).toBe('bytes')
    expect(filePreviewSource('docs/spec.pdf')).toBe('bytes')
    expect(filePreviewSource('build/app.zip')).toBe('none')
  })
})

describe('filePreviewMediaType', () => {
  it('names image and PDF bytes by extension, text as text, and anything else as bytes', () => {
    expect(filePreviewMediaType('a/b/logo.svg')).toBe('image/svg+xml')
    expect(filePreviewMediaType('photo.JPG')).toBe('image/jpeg')
    expect(filePreviewMediaType('spec.pdf')).toBe('application/pdf')
    expect(filePreviewMediaType('notes.md')).toBe('text/plain')
    expect(filePreviewMediaType('app.zip')).toBe('application/octet-stream')
  })
})

describe('filePreviewFailure', () => {
  it('reads a 404 as the file being gone', () => {
    expect(filePreviewFailure(TARGET, axiosError(404, 'ENOENT'))).toEqual({
      status: 'gone',
      target: TARGET,
    })
  })

  it('says what the backend said for any other failure', () => {
    expect(filePreviewFailure(TARGET, axiosError(500, 'Disk on fire'))).toEqual({
      status: 'error',
      target: TARGET,
      message: 'Disk on fire',
    })
  })

  it('says the file could not be read when there is no message to show', () => {
    expect(filePreviewFailure(TARGET, {})).toEqual({
      status: 'error',
      target: TARGET,
      message: FILE_PREVIEW_COPY.errorFallback,
    })
    expect(filePreviewFailure(TARGET, new Error('Network down'))).toMatchObject({
      status: 'error',
      message: 'Network down',
    })
    expect(filePreviewFailure(TARGET, axiosError(undefined))).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/Could not reach the backend/),
    })
  })
})

describe('filePreviewInfoOf', () => {
  it('keeps what the Files list knows about a file', () => {
    expect(
      filePreviewInfoOf({
        relativePath: 'a.md',
        absolutePath: '/repo/a.md',
        name: 'a.md',
        ext: 'md',
        size: 12,
        mtime: 1,
        ctime: 2,
        type: 'markdown',
      }),
    ).toEqual({
      absolutePath: '/repo/a.md',
      ext: 'md',
      size: 12,
      mtime: 1,
      ctime: 2,
      type: 'markdown',
    })
  })

  it('leaves out what it does not know, and is nothing for nothing', () => {
    expect(
      filePreviewInfoOf({
        absolutePath: '/repo/LICENSE',
        name: 'LICENSE',
        size: 3,
        mtime: 0,
        ctime: 0,
      }),
    ).toEqual({
      absolutePath: '/repo/LICENSE',
      size: 3,
      mtime: 0,
      ctime: 0,
    })
    expect(filePreviewInfoOf(undefined)).toBeUndefined()
  })
})

const TEXT: FilePreviewContent = {
  kind: 'markdown',
  text: '# Hi',
  bytes: null,
  mediaType: 'text/plain',
}

describe('filePreviewSize', () => {
  it('takes the size the Files list knows over the bytes it read', () => {
    expect(filePreviewSize({ ...TEXT, info: { size: 40 } })).toBe(40)
    expect(
      filePreviewSize({
        kind: 'image',
        text: null,
        bytes: new ArrayBuffer(7),
        mediaType: 'image/png',
      }),
    ).toBe(7)
    expect(filePreviewSize(TEXT)).toBeNull()
  })
})

describe('filePreviewInfoRows', () => {
  it('lists the path, its project, where it is, what it is, its size and its times', () => {
    const rows = filePreviewInfoRows(
      { ...TARGET, projectName: 'Compass BE' },
      {
        ...TEXT,
        info: {
          absolutePath: '/repo/docs/ZNR-780_PROPOSAL.md',
          type: 'markdown',
          size: 2048,
          mtime: 1_700_000_000_000,
          ctime: 1_600_000_000_000,
        },
      },
    )
    expect(rows).toEqual([
      { label: 'Path', value: 'docs/ZNR-780_PROPOSAL.md' },
      { label: 'Project', value: 'Compass BE' },
      { label: 'Absolute', value: '/repo/docs/ZNR-780_PROPOSAL.md' },
      { label: 'Type', value: 'markdown' },
      { label: 'Size', value: '2 KB' },
      { label: 'Modified', value: formatFileDate(1_700_000_000_000) },
      { label: 'Created', value: formatFileDate(1_600_000_000_000) },
    ])
  })

  it('names the kind when the type is not known, and leaves out what is not', () => {
    expect(filePreviewInfoRows(TARGET, TEXT)).toEqual([
      { label: 'Path', value: 'docs/ZNR-780_PROPOSAL.md' },
      { label: 'Type', value: 'markdown' },
    ])
    expect(
      filePreviewInfoRows(TARGET, { ...TEXT, info: { absolutePath: TARGET.path, mtime: 0 } }),
    ).toEqual([
      { label: 'Path', value: 'docs/ZNR-780_PROPOSAL.md' },
      { label: 'Type', value: 'markdown' },
      { label: 'Modified', value: formatFileDate(0) },
    ])
  })
})

describe('filePreviewName and filePreviewCaption', () => {
  it('names the file by its last segment', () => {
    expect(filePreviewName('docs/ZNR-780_PROPOSAL.md')).toBe('ZNR-780_PROPOSAL.md')
    expect(filePreviewName('LICENSE')).toBe('LICENSE')
  })

  it('captions a file with its project where the target names one', () => {
    expect(filePreviewCaption({ ...TARGET, projectName: 'Compass BE' })).toBe('File in Compass BE')
    expect(filePreviewCaption(TARGET)).toBe('File')
  })
})

describe('ownFileDescription', () => {
  it('describes a file of the project on screen by that project, with no project name', () => {
    const description = ownFileDescription('p', 'src/app.ts')
    expect(description).toEqual({
      kind: 'file',
      label: 'src/app.ts',
      link: { kind: 'file', projectId: 'p', path: 'src/app.ts' },
    })
    expect(description && filePreviewTarget(description)).toEqual({
      projectId: 'p',
      path: 'src/app.ts',
    })
  })

  it('describes a file at the root as it does a nested one', () => {
    expect(ownFileDescription('compass-be', 'README.md')?.link).toEqual({
      kind: 'file',
      projectId: 'compass-be',
      path: 'README.md',
    })
  })

  it('describes nothing for a folder', () => {
    expect(ownFileDescription('p', 'docs/')).toBeUndefined()
  })

  it('describes nothing with no project on screen', () => {
    expect(ownFileDescription(undefined, 'src/app.ts')).toBeUndefined()
    expect(ownFileDescription(null, 'src/app.ts')).toBeUndefined()
    expect(ownFileDescription('', 'src/app.ts')).toBeUndefined()
  })

  it('describes nothing for a file with no path in the project', () => {
    expect(ownFileDescription('p', undefined)).toBeUndefined()
    expect(ownFileDescription('p', null)).toBeUndefined()
    expect(ownFileDescription('p', '')).toBeUndefined()
  })
})

describe('filePreviewPanes', () => {
  it('offers a markdown file its source, both, or its preview', () => {
    expect(filePreviewPanes('markdown')).toEqual(['edit', 'both', 'preview'])
  })

  it('offers an html file its source or the page, never both', () => {
    expect(filePreviewPanes('html')).toEqual(['edit', 'preview'])
  })

  it('offers no switch for a file with one way to show it', () => {
    for (const kind of ['text', 'image', 'pdf', 'binary'] as const) {
      expect(filePreviewPanes(kind)).toEqual([])
    }
  })
})

describe('filePreviewInitialPane', () => {
  it('opens a markdown file on its preview to read, on both to edit', () => {
    expect(filePreviewInitialPane('markdown', false)).toBe('preview')
    expect(filePreviewInitialPane('markdown', true)).toBe('both')
  })

  it('opens an html file on the page, read or edited', () => {
    expect(filePreviewInitialPane('html', false)).toBe('preview')
    expect(filePreviewInitialPane('html', true)).toBe('preview')
  })

  it('opens on a pane the kind offers, whenever it offers any', () => {
    for (const kind of ['markdown', 'html'] as const) {
      for (const editing of [true, false]) {
        expect(filePreviewPanes(kind)).toContain(filePreviewInitialPane(kind, editing))
      }
    }
  })
})
