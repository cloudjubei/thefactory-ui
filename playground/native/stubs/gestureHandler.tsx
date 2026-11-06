import type { ReactNode } from 'react'

const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>

type GestureChain = { (): GestureChain; [method: string]: GestureChain }

const chain: GestureChain = new Proxy((() => chain) as GestureChain, {
  get: () => chain,
  apply: () => chain,
})

/** Gestures do nothing in a browser: a panel draws, it is not swiped. */
export const Gesture = chain
export const GestureDetector = Passthrough
export const GestureHandlerRootView = Passthrough
export const Swipeable = Passthrough
