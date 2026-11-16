import { classifyFileByExtension } from '../utils/filePaneKind'
import { filePreviewFailure, filePreviewMediaType, filePreviewSource } from '../utils/filePreview'
import type {
  FilePreviewCalls,
  FilePreviewInfo,
  FilePreviewState,
  FilePreviewTarget,
} from '../utils/filePreviewTypes'

/**
 * Reads one file for its preview, by the project the file is in: its text or
 * its bytes as its kind is read, then what that project's Files list knows
 * about it. Opening another file —
 * or none — drops whatever arrives late for the one before.
 */
export class FilePreviewLoader {
  private readonly _calls: FilePreviewCalls
  private readonly _onChange: (state: FilePreviewState | null) => void
  private _state: FilePreviewState | null = null
  private _generation = 0

  constructor(calls: FilePreviewCalls, onChange: (state: FilePreviewState | null) => void) {
    this._calls = calls
    this._onChange = onChange
  }

  get state(): FilePreviewState | null {
    return this._state
  }

  open(target: FilePreviewTarget | null): void {
    this._generation += 1
    if (!target) {
      this.set(null)
      return
    }
    void this.load(target, this._generation)
  }

  /** Reads the file shown again — after a failure. */
  reload(): void {
    if (this._state) this.open(this._state.target)
  }

  private async load(target: FilePreviewTarget, generation: number): Promise<void> {
    this.set({ status: 'loading', target })
    const { projectId, path } = target
    const info = this._calls.readInfo(projectId, path).catch(() => undefined)
    const source = filePreviewSource(path)
    try {
      const text = source === 'text' ? await this._calls.readText(projectId, path) : null
      const bytes = source === 'bytes' ? await this._calls.readBytes(projectId, path) : null
      if (generation !== this._generation) return
      this.set({
        status: 'ready',
        target,
        kind: classifyFileByExtension(path),
        text,
        bytes,
        mediaType: filePreviewMediaType(path),
      })
    } catch (err) {
      if (generation === this._generation) this.set(filePreviewFailure(target, err))
      return
    }
    this.addInfo(await info, generation)
  }

  private addInfo(info: FilePreviewInfo | undefined, generation: number): void {
    const state = this._state
    if (!info || generation !== this._generation || state?.status !== 'ready') return
    this.set({ ...state, info })
  }

  private set(state: FilePreviewState | null): void {
    this._state = state
    this._onChange(state)
  }
}
