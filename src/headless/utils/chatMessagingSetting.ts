export const CHAT_MESSAGING_SETTING_KEY = 'chatMessaging'
export const CHAT_MESSAGING_SETTING_LABEL = 'Let agents message other chats without asking'
export const CHAT_MESSAGING_SETTING_HINT =
  'Applies to every chat. The message-chain limit and busy-chat hold still apply. Changing this does not decide a waiting message.'

export function chatMessagingAllowed(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'allowWithoutAsking' in value &&
    value.allowWithoutAsking === true
  )
}

export type ChatMessagingSettingState = {
  allowed: boolean
  loading: boolean
  ready: boolean
  saving: boolean
  error: string | null
}

/** One confirmed value shared by settings and approval cards; failed writes never grant permission. */
export class ChatMessagingSettingStore {
  private state: ChatMessagingSettingState = {
    allowed: false,
    loading: true,
    ready: false,
    saving: false,
    error: null,
  }
  private listeners = new Set<() => void>()
  private reading: Promise<void> | undefined

  private read: () => Promise<unknown>
  private write: (value: { allowWithoutAsking: boolean }) => Promise<void>

  constructor(
    read: () => Promise<unknown>,
    write: (value: { allowWithoutAsking: boolean }) => Promise<void>,
  ) {
    this.read = read
    this.write = write
  }

  snapshot = (): ChatMessagingSettingState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private patch(next: Partial<ChatMessagingSettingState>) {
    this.state = { ...this.state, ...next }
    for (const listener of this.listeners) listener()
  }

  load = (): Promise<void> => {
    if (this.reading) return this.reading
    if (this.state.saving) return Promise.resolve()
    this.patch({ loading: true, error: null })
    this.reading = this.read()
      .then((value) => {
        this.patch({ allowed: chatMessagingAllowed(value), ready: true })
      })
      .catch(() => this.patch({ error: 'The messaging setting could not be loaded.' }))
      .finally(() => {
        this.reading = undefined
        this.patch({ loading: false })
      })
    return this.reading
  }

  setAllowed = async (allowed: boolean): Promise<void> => {
    if (!this.state.ready || this.state.loading || this.state.saving) return
    this.patch({ saving: true, error: null })
    try {
      await this.write({ allowWithoutAsking: allowed })
      this.patch({ allowed })
    } catch {
      this.patch({ error: 'The messaging setting could not be saved. Try again.' })
    } finally {
      this.patch({ saving: false })
    }
  }
}
