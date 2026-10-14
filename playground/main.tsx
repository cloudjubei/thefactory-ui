import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from 'thefactory-ui/web'
import Showcase from './showcase/Showcase'
import { routeOf } from './showcase/registry'
import './main.css'

const route = routeOf(window.location.search)
// A single state is a page to screenshot: main.css stills every animation and caret on it.
if (route.kind === 'state') document.documentElement.dataset.showcase = 'state'
document.title =
  route.kind === 'index'
    ? 'thefactory-ui showcase'
    : route.kind === 'missing'
      ? 'No such scene — thefactory-ui showcase'
      : route.kind === 'scene'
        ? `${route.scene.title} — thefactory-ui showcase`
        : `${route.scene.title}: ${route.state.title} — thefactory-ui showcase`

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root missing')
createRoot(rootEl).render(
  <StrictMode>
    <ToastProvider>
      <Showcase route={route} />
    </ToastProvider>
  </StrictMode>,
)
