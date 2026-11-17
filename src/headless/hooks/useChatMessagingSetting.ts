import { useEffect, useSyncExternalStore } from 'react'
import { useAuthToken } from '../api/AuthContext'
import { getUserSetting, putUserSetting } from '../api/generated'
import {
  CHAT_MESSAGING_SETTING_KEY,
  ChatMessagingSettingStore,
} from '../utils/chatMessagingSetting'

const stores = new Map<string | null, ChatMessagingSettingStore>()

function storeFor(token: string | null): ChatMessagingSettingStore {
  let store = stores.get(token)
  if (!store) {
    store = new ChatMessagingSettingStore(
      async () => {
        const { data } = await getUserSetting({
          path: { key: CHAT_MESSAGING_SETTING_KEY },
          throwOnError: true,
        })
        return data.value
      },
      async (value) => {
        await putUserSetting({
          path: { key: CHAT_MESSAGING_SETTING_KEY },
          body: { value },
          throwOnError: true,
        })
      },
    )
    stores.set(token, store)
  }
  return store
}

/** User-global permission, shared between mounted settings and send-message cards. */
export function useChatMessagingSetting() {
  const token = useAuthToken()
  const store = storeFor(token)
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot)
  useEffect(() => {
    if (token) void store.load()
  }, [store, token])
  return { ...state, setAllowed: store.setAllowed, retry: store.load }
}
