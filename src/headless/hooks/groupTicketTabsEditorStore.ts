import { extractErrorMessage } from '../api/errorMessage'
import { readGroupTicketTabs, saveGroupTicketTabs } from '../api/groupTicketTabsApi'
import { GROUP_TICKET_TABS_TEXT } from '../utils/groupTicketTabConstants'
import { changeGroupTicketTabs } from '../utils/groupTicketTabsEditor'
import type {
  GroupTicketTab,
  GroupTicketTabs,
  GroupTicketTabsChange,
  GroupTicketTabsEditorState,
} from '../utils/groupTicketTabTypes'

const EMPTY: GroupTicketTabsEditorState = {
  tabs: undefined,
  readError: null,
  saving: 0,
  saveError: null,
}

/**
 * A group's ticket tabs in Settings: each change shows at once and is saved,
 * one save at a time — changes made meanwhile go as one save of the latest
 * once it answers. A refused save undoes it and every change after it, with
 * why. `onSaved` hears each saved set of tabs, for the Tickets tab to follow.
 */
export class GroupTicketTabsEditorStore {
  private _state: GroupTicketTabsEditorState = EMPTY
  private readonly _listeners = new Set<() => void>()
  private readonly _groupId: string
  private readonly _onSaved: (saved: GroupTicketTabs) => void
  /** What the backend holds, as it last said. */
  private _saved: GroupTicketTabs | undefined
  /** The tabs to send once the save on its way answers. */
  private _next: GroupTicketTab[] | undefined
  private _flight: Promise<void> | undefined

  constructor(groupId: string, onSaved: (saved: GroupTicketTabs) => void) {
    this._groupId = groupId
    this._onSaved = onSaved
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): GroupTicketTabsEditorState => this._state

  private _set(patch: Partial<GroupTicketTabsEditorState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  /** Read the tabs again; a failed read keeps those shown, with why. */
  read = async (): Promise<void> => {
    try {
      const tabs = await readGroupTicketTabs(this._groupId)
      this._saved = tabs
      if (this._state.saving === 0) this._set({ tabs, readError: null })
    } catch (err) {
      this._set({ readError: extractErrorMessage(err, GROUP_TICKET_TABS_TEXT.readFailed) })
    }
  }

  /** Make one change: shown at once, saved after any save on its way. */
  change = (change: GroupTicketTabsChange): void => {
    const shown = this._state.tabs
    if (!shown) return
    const tabs = changeGroupTicketTabs(shown.tabs, change)
    if (tabs === shown.tabs) return
    this._set({ tabs: { tabs, custom: true }, saveError: null })
    this._send(tabs)
  }

  /** Go back to the default tabs: the backend answers which they are. */
  reset = (): void => {
    if (!this._state.tabs) return
    this._set({ saveError: null })
    this._send([])
  }

  /** Once no save is on its way. */
  idle = async (): Promise<void> => {
    while (this._flight) await this._flight
  }

  private _send(tabs: GroupTicketTab[]): void {
    if (this._flight) {
      this._next = tabs
      return
    }
    this._set({ saving: this._state.saving + 1 })
    this._flight = this._save(tabs).finally(() => {
      this._flight = undefined
      const next = this._next
      this._next = undefined
      if (next) this._send(next)
    })
  }

  private async _save(tabs: GroupTicketTab[]): Promise<void> {
    try {
      const answer = (await saveGroupTicketTabs(this._groupId, tabs)) as Partial<GroupTicketTabs>
      const saved: GroupTicketTabs = Array.isArray(answer?.tabs)
        ? { tabs: answer.tabs, custom: answer.custom ?? tabs.length > 0 }
        : { tabs, custom: tabs.length > 0 }
      this._saved = saved
      this._onSaved(saved)
      this._set({ saving: this._state.saving - 1, ...(this._next ? {} : { tabs: saved }) })
    } catch (err) {
      this._next = undefined
      this._set({
        saving: this._state.saving - 1,
        tabs: this._saved,
        saveError: extractErrorMessage(err, GROUP_TICKET_TABS_TEXT.saveFailed),
      })
    }
  }
}
