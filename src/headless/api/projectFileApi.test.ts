import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  readFile: vi.fn(),
  readFileRaw: vi.fn(),
  writeFile: vi.fn(),
  renameFiles: vi.fn(),
  deleteFiles: vi.fn(),
}))
const files = vi.hoisted(() => ({ loadProjectFiles: vi.fn() }))

vi.mock('./generated', () => sdk)
vi.mock('../contexts/FilesContext', () => files)

import {
  PROJECT_FILE_CALLS,
  deleteProjectFile,
  readProjectFileBytes,
  readProjectFileInfo,
  readProjectFileText,
  renameProjectFile,
  writeProjectFile,
} from './projectFileApi'

const BYTES = new Uint8Array([137, 80, 78, 71]).buffer

beforeEach(() => {
  sdk.readFile.mockReset().mockResolvedValue({ data: { content: '# Proposal' } })
  sdk.readFileRaw.mockReset().mockResolvedValue({ data: BYTES })
  sdk.writeFile.mockReset().mockResolvedValue({ data: { diff: '' } })
  sdk.renameFiles.mockReset().mockResolvedValue({ data: undefined })
  sdk.deleteFiles.mockReset().mockResolvedValue({ data: undefined })
  files.loadProjectFiles.mockReset().mockResolvedValue([
    {
      relativePath: 'docs/a.md',
      absolutePath: '/repo/docs/a.md',
      name: 'a.md',
      size: 10,
      mtime: 1,
      ctime: 2,
      ext: 'md',
    },
    { absolutePath: 'LICENSE', name: 'LICENSE', size: 3, mtime: 4, ctime: 5 },
  ])
})

describe('reading a file of any project', () => {
  it('reads its text from the project the link names', async () => {
    expect(await readProjectFileText('compass-be', 'docs/a.md')).toBe('# Proposal')
    expect(sdk.readFile).toHaveBeenCalledWith({
      path: { projectId: 'compass-be' },
      body: { path: 'docs/a.md' },
      throwOnError: true,
    })
  })

  it('reads its raw bytes through the authenticated client, as an array buffer', async () => {
    expect(await readProjectFileBytes('compass-be', 'shot.png')).toBe(BYTES)
    expect(sdk.readFileRaw).toHaveBeenCalledWith({
      path: { projectId: 'compass-be' },
      query: { path: 'shot.png' },
      responseType: 'arraybuffer',
      throwOnError: true,
    })
  })

  it('finds its info in the project’s Files list, by relative path or by the path it was listed at', async () => {
    expect(await readProjectFileInfo('compass-be', 'docs/a.md')).toEqual({
      absolutePath: '/repo/docs/a.md',
      size: 10,
      mtime: 1,
      ctime: 2,
      ext: 'md',
    })
    expect(files.loadProjectFiles).toHaveBeenCalledWith('compass-be')
    expect(await readProjectFileInfo('compass-be', 'LICENSE')).toEqual({
      absolutePath: 'LICENSE',
      size: 3,
      mtime: 4,
      ctime: 5,
    })
    expect(await readProjectFileInfo('compass-be', 'docs/missing.md')).toBeUndefined()
  })

  it('lets a refused read throw to its caller', async () => {
    sdk.readFile.mockRejectedValue(new Error('404'))
    await expect(readProjectFileText('p', 'gone.md')).rejects.toThrow('404')
  })
})

describe('changing a file of any project', () => {
  it('writes, renames and deletes it in the project the link names', async () => {
    await writeProjectFile('compass-be', 'docs/a.md', 'new text')
    expect(sdk.writeFile).toHaveBeenCalledWith({
      path: { projectId: 'compass-be' },
      body: { path: 'docs/a.md', content: 'new text' },
      throwOnError: true,
    })
    await renameProjectFile('compass-be', 'docs/a.md', 'docs/b.md')
    expect(sdk.renameFiles).toHaveBeenCalledWith({
      path: { projectId: 'compass-be' },
      body: { moves: [{ src: 'docs/a.md', dst: 'docs/b.md' }] },
      throwOnError: true,
    })
    await deleteProjectFile('compass-be', 'docs/b.md')
    expect(sdk.deleteFiles).toHaveBeenCalledWith({
      path: { projectId: 'compass-be' },
      body: { paths: ['docs/b.md'] },
      throwOnError: true,
    })
  })

  it('hands a preview every call', () => {
    expect(PROJECT_FILE_CALLS).toEqual({
      readText: readProjectFileText,
      readBytes: readProjectFileBytes,
      readInfo: readProjectFileInfo,
      write: writeProjectFile,
      rename: renameProjectFile,
      remove: deleteProjectFile,
    })
  })
})
