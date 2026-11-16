import { describe, expect, it, vi } from 'vitest'
import { FilePreviewLoader } from './filePreviewLoader'
import type {
  FilePreviewCalls,
  FilePreviewState,
  FilePreviewTarget,
} from '../utils/filePreviewTypes'

const MD: FilePreviewTarget = {
  projectId: 'compass-be',
  path: 'docs/ZNR-780_PROPOSAL.md',
  projectName: 'Compass BE',
}
const PNG: FilePreviewTarget = { projectId: 'compass-be', path: 'shots/home.png' }
const ZIP: FilePreviewTarget = { projectId: 'p', path: 'build/app.zip' }
const BYTES = new Uint8Array([1, 2, 3]).buffer
const INFO = { absolutePath: '/repo/docs/ZNR-780_PROPOSAL.md', size: 10, mtime: 1, ctime: 2 }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function calls(over: Partial<FilePreviewCalls> = {}): FilePreviewCalls {
  return {
    readText: vi.fn(async () => '# Proposal'),
    readBytes: vi.fn(async () => BYTES),
    readInfo: vi.fn(async () => INFO),
    ...over,
  }
}

function loaderWith(fetches: FilePreviewCalls) {
  const seen: Array<FilePreviewState | null> = []
  const loader = new FilePreviewLoader(fetches, (state) => seen.push(state))
  return { loader, seen }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const notFound = { isAxiosError: true, response: { status: 404, data: { error: 'ENOENT' } } }

describe('FilePreviewLoader', () => {
  it('reads a text file from its own project, shows it, then adds what the Files list knows', async () => {
    const info = deferred<typeof INFO>()
    const fetches = calls({ readInfo: vi.fn(() => info.promise) })
    const { loader, seen } = loaderWith(fetches)
    loader.open(MD)
    expect(loader.state).toEqual({ status: 'loading', target: MD })
    await flush()
    expect(fetches.readText).toHaveBeenCalledWith('compass-be', 'docs/ZNR-780_PROPOSAL.md')
    expect(fetches.readBytes).not.toHaveBeenCalled()
    expect(loader.state).toEqual({
      status: 'ready',
      target: MD,
      kind: 'markdown',
      text: '# Proposal',
      bytes: null,
      mediaType: 'text/plain',
    })
    info.resolve(INFO)
    await flush()
    expect(loader.state).toMatchObject({ status: 'ready', text: '# Proposal', info: INFO })
    expect(seen.map((s) => s?.status)).toEqual(['loading', 'ready', 'ready'])
  })

  it('reads an image as bytes, named for its viewer', async () => {
    const { loader } = loaderWith(calls())
    loader.open(PNG)
    await flush()
    expect(loader.state).toEqual({
      status: 'ready',
      target: PNG,
      kind: 'image',
      text: null,
      bytes: BYTES,
      mediaType: 'image/png',
      info: INFO,
    })
  })

  it('reads nothing of a file no viewer shows, and shows it with what is known', async () => {
    const fetches = calls({ readInfo: vi.fn(async () => undefined) })
    const { loader } = loaderWith(fetches)
    loader.open(ZIP)
    await flush()
    expect(fetches.readText).not.toHaveBeenCalled()
    expect(fetches.readBytes).not.toHaveBeenCalled()
    expect(loader.state).toEqual({
      status: 'ready',
      target: ZIP,
      kind: 'binary',
      text: null,
      bytes: null,
      mediaType: 'application/octet-stream',
    })
  })

  it('shows a file that is not there as gone, and any other failure as an error', async () => {
    const gone = loaderWith(calls({ readText: vi.fn(async () => Promise.reject(notFound)) }))
    gone.loader.open(MD)
    await flush()
    expect(gone.loader.state).toEqual({ status: 'gone', target: MD })
    const failed = loaderWith(
      calls({ readBytes: vi.fn(async () => Promise.reject(new Error('Network down'))) }),
    )
    failed.loader.open(PNG)
    await flush()
    expect(failed.loader.state).toEqual({ status: 'error', target: PNG, message: 'Network down' })
  })

  it('shows the file without its info when the Files list cannot be read', async () => {
    const { loader } = loaderWith(calls({ readInfo: vi.fn(async () => Promise.reject(notFound)) }))
    loader.open(MD)
    await flush()
    expect(loader.state).toMatchObject({ status: 'ready', text: '# Proposal' })
    expect(loader.state).not.toHaveProperty('info')
  })

  it('drops what arrives for a file it is no longer showing', async () => {
    const first = deferred<string>()
    const firstInfo = deferred<typeof INFO>()
    const fetches = calls({
      readText: vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue('second'),
      readInfo: vi.fn().mockReturnValueOnce(firstInfo.promise).mockResolvedValue(undefined),
    })
    const { loader } = loaderWith(fetches)
    loader.open(MD)
    const other = { ...MD, path: 'docs/other.md' }
    loader.open(other)
    await flush()
    first.resolve('first')
    firstInfo.resolve(INFO)
    await flush()
    expect(loader.state).toMatchObject({ status: 'ready', target: other, text: 'second' })
    expect(loader.state).not.toHaveProperty('info')
  })

  it('drops a failure that arrives after it closed', async () => {
    const read = deferred<string>()
    const { loader, seen } = loaderWith(calls({ readText: vi.fn(() => read.promise) }))
    loader.open(MD)
    loader.open(null)
    read.reject(new Error('late'))
    await flush()
    expect(loader.state).toBeNull()
    expect(seen).toEqual([{ status: 'loading', target: MD }, null])
  })

  it('reads the file again on a retry, and does nothing with nothing open', async () => {
    const readText = vi.fn().mockRejectedValueOnce(new Error('flaky')).mockResolvedValue('# Back')
    const { loader } = loaderWith(calls({ readText }))
    loader.reload()
    expect(loader.state).toBeNull()
    loader.open(MD)
    await flush()
    expect(loader.state).toMatchObject({ status: 'error' })
    loader.reload()
    expect(loader.state).toEqual({ status: 'loading', target: MD })
    await flush()
    expect(loader.state).toMatchObject({ status: 'ready', text: '# Back' })
  })
})
