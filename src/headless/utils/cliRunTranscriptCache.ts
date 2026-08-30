import type { CliRunTranscriptEntry } from '../api/generated'
import { CLI_TRANSCRIPT_CACHE_MAX_RUNS } from './cliRunActivityConstants'

/**
 * In-memory, per-run store of the transcript as it streamed.
 *
 * A live CLI run's view is remounted routinely — the trailing "run in flight"
 * block hands over to the inline row the moment the run's placeholder message is
 * persisted, and navigating away and back tears it down entirely. Re-fetching
 * the run record is not a recovery: the resident runner only writes its
 * transcript at the terminal write, so mid-run the record answers with an EMPTY
 * transcript and every step the user had watched arrive would vanish.
 *
 * Bounded by insertion order so a long session cannot accumulate transcripts for
 * every run it ever watched. Not persisted — a reload starts from the record.
 */
export class CliRunTranscriptCache {
  private readonly _byRunId = new Map<string, CliRunTranscriptEntry[]>()
  private readonly _maxRuns: number

  constructor(maxRuns: number = CLI_TRANSCRIPT_CACHE_MAX_RUNS) {
    this._maxRuns = maxRuns
  }

  /** Entries remembered for this run, or `undefined` when it has never been watched. */
  get(runId: string): CliRunTranscriptEntry[] | undefined {
    return this._byRunId.get(runId)
  }

  /**
   * Remember this run's transcript, keeping whichever copy is longer — a caller
   * committing a shrunken record must not overwrite a longer live stream.
   * Re-inserts so the run counts as the most recently touched.
   */
  set(runId: string, transcript: CliRunTranscriptEntry[]): void {
    const existing = this._byRunId.get(runId)
    const next = existing && existing.length > transcript.length ? existing : transcript
    this._byRunId.delete(runId)
    this._byRunId.set(runId, next)
    while (this._byRunId.size > this._maxRuns) {
      const oldest = this._byRunId.keys().next().value
      if (oldest === undefined) break
      this._byRunId.delete(oldest)
    }
  }

  /** Number of runs currently remembered. */
  get size(): number {
    return this._byRunId.size
  }

  clear(): void {
    this._byRunId.clear()
  }
}

/**
 * The single process-wide cache the live run views share, so any mount of a
 * given runId picks up where the last one left off.
 */
export const cliRunTranscripts = new CliRunTranscriptCache()
