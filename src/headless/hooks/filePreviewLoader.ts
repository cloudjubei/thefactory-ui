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
 * about it. Saves, renames and deletes it there too. Opening another file —
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

  /** Saves the file shown; a refused save throws, for the pane to say. */
  async write(content: string): Promise<void> {
    const state = this._state
    if (state?.status !== 'ready') return
    const generation = this._generation
    await this._calls.write(state.target.projectId, state.target.path, content)
    const now = this._state
    if (generation === this._generation && now?.status === 'ready') {
      this.set({ ...now, text: content })
    }
  }

  /** Moves the file shown, then reads it at its new path — its kind may have changed. */
  async rename(to: string): Promise<void> {
    const state = this._state
    if (state?.status !== 'ready') return
    await this._calls.rename(state.target.projectId, state.target.path, to)
    this.open({ ...state.target, path: to })
  }

  /** Deletes the file shown; it then shows as gone. */
  async remove(): Promise<void> {
    const state = this._state
    if (state?.status !== 'ready') return
    await this._calls.remove(state.target.projectId, state.target.path)
    this._generation += 1
    this.set({ status: 'gone', target: state.target })
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
