import { useEffect, useRef } from 'react'
import { parseAppElementPick, type AppElementPick } from '../utils/appSelections'

/** Shared lifecycle for iframe and WebView; transport and trusted-source checks stay in the peer. */
export function useAppElementPicker({
  active,
  mountKey,
  send,
  onPick,
}: {
  active: boolean
  mountKey: string
  send: (message: unknown) => void
  onPick?: (pick: AppElementPick) => void
}) {
  const current = useRef({ active, send, onPick })
  current.current = { active, send, onPick }
  const sync = () =>
    current.current.send({ type: 'overseer:pick.set', payload: { active: current.current.active } })
  useEffect(() => {
    sync()
    return () => current.current.send({ type: 'overseer:pick.set', payload: { active: false } })
  }, [active, mountKey])
  return {
    sync,
    receive: (type: string, payload: unknown) => {
      if (type !== 'overseer:pick.selected') return false
      if (current.current.active) {
        const pick = parseAppElementPick(payload)
        if (pick) current.current.onPick?.(pick)
      }
      return true
    },
  }
}
