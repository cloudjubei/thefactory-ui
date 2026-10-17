import { StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DESIGN_PLAYGROUND_SHOW_MESSAGE } from 'thefactory-tools/constants'
import { designPlaygroundUrl } from 'thefactory-tools/utils'
import { ToastProvider } from 'thefactory-ui/web'
import Showcase from './showcase/Showcase'
import { playgroundMessage, routeOf, themeOf, type SceneRoute } from './showcase/registry'
import './main.css'

function titleOf(route: SceneRoute): string {
  switch (route.kind) {
    case 'index':
      return 'thefactory-ui showcase'
    case 'missing':
      return 'No such scene — thefactory-ui showcase'
    case 'scene':
    case 'play':
      return `${route.scene.title} — thefactory-ui showcase`
    case 'state':
      return `${route.scene.title}: ${route.state.title} — thefactory-ui showcase`
  }
}

/** The page's look for its URL: the theme it asks for, and a still page for a state or a play. */
function applyPage(search: string, route: SceneRoute): void {
  const root = document.documentElement
  const theme = themeOf(search)
  root.classList.toggle('dark', theme === 'dark')
  if (theme) root.dataset.theme = theme
  else delete root.dataset.theme
  root.style.colorScheme = theme ?? ''
  // A single state is a page to screenshot: main.css stills every animation and caret on it.
  if (route.kind === 'state' || route.kind === 'play') root.dataset.showcase = 'state'
  else delete root.dataset.showcase
  document.title = titleOf(route)
}

/** Where the page tells its scenes: the page framing it, or the app's WebView showing it. */
function framer(): ((message: unknown) => void) | undefined {
  const native = (window as { ReactNativeWebView?: { postMessage: (data: string) => void } })
    .ReactNativeWebView
  if (native) return (message) => native.postMessage(JSON.stringify(message))
  if (window.parent !== window) return (message) => window.parent.postMessage(message, '*')
  return undefined
}

/**
 * The showcase at its URL. Shown by the Design view's Playground — in a frame or the app's
 * WebView — it tells it its scenes and their controls, and shows the address it asks for without
 * reloading.
 */
function Root() {
  const [search, setSearch] = useState(window.location.search)
  const route = routeOf(search)
  useLayoutEffect(() => applyPage(search, routeOf(search)), [search])
  useEffect(() => {
    const tell = framer()
    if (!tell) return
    tell(playgroundMessage())
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; address?: unknown; theme?: unknown } | null
      if (data?.type !== DESIGN_PLAYGROUND_SHOW_MESSAGE || typeof data.address !== 'string') return
      const next = designPlaygroundUrl('', data.address, data.theme === 'dark' ? 'dark' : 'light')
      window.history.replaceState(null, '', next)
      setSearch(next)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  return <Showcase route={route} />
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root missing')
createRoot(rootEl).render(
  <StrictMode>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </StrictMode>,
)
