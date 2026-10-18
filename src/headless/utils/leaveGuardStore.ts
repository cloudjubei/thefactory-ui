import type { LeaveGuardListener, PendingLeave } from './leaveGuardTypes'

/**
 * Leave-intents behind unsaved work. A surface with unsaved work registers a blocker with the
 * question to ask; every way out of it goes through {@link request}, which runs the leave at once
 * when nothing blocks and otherwise holds it for the host's confirmation. A confirmed leave runs
 * with blocking suspended, so the navigations it makes go straight through.
 */
export class LeaveGuardStore {
  private readonly _blockers = new Map<string, string>()
  private readonly _listeners = new Set<LeaveGuardListener>()
  private _pending: PendingLeave | null = null
  private _bypassing = false

  setBlocker(id: string, message: string | null): void {
    if (message === null) {
      if (!this._blockers.delete(id)) return
    } else {
      if (this._blockers.get(id) === message) return
      this._blockers.delete(id)
      this._blockers.set(id, message)
    }
    this._emit()
  }

  blockingMessage(): string | null {
    if (this._bypassing) return null
    let latest: string | null = null
    for (const message of this._blockers.values()) latest = message
    return latest
  }

  request(proceed: () => void): void {
    const message = this.blockingMessage()
    if (message === null) {
      proceed()
      return
    }
    this._pending = { message, proceed }
    this._emit()
  }

  pendingMessage(): string | null {
    return this._pending?.message ?? null
  }

  confirm(): void {
    const pending = this._pending
    if (!pending) return
    this._pending = null
    this._emit()
    this._bypassing = true
    try {
      pending.proceed()
    } finally {
      this._bypassing = false
    }
  }

  cancel(): void {
    if (!this._pending) return
    this._pending = null
    this._emit()
  }

  subscribe(listener: LeaveGuardListener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  private _emit(): void {
    for (const listener of this._listeners) listener()
  }
}
