import BackendConnectionPanel from '../../src/web/compound/settings/BackendConnectionPanel'
import type { Scene } from '../showcase/types'

const noop = () => {}

const handlers = {
  onSaveUrl: noop,
  onSaveToken: noop,
  onClearToken: noop,
  onResetAll: noop,
}

export const BACKEND_CONNECTION_SCENES: Scene[] = [
  {
    id: 'backend-connection',
    title: 'Backend connection',
    component: 'BackendConnectionPanel',
    group: 'Settings',
    description:
      'Developer settings’ backend connection, the same on web and desktop (mobile’s Backend screen uses the native Test connection and Reset card from the same copy): the URL, WebSocket and token rows, replacing the URL with a Test connection, replacing or clearing the token, and Reset all, which clears both and returns to the login screen.',
    states: [
      {
        id: 'connected',
        title: 'Connected',
        description: 'A saved URL and token, the socket open.',
        render: () => (
          <BackendConnectionPanel
            clientName="this web app"
            baseUrl="http://localhost:7001"
            token="tfk_live_3f9a2c7e51b8"
            wsState="open"
            unauthorized={false}
            {...handlers}
          />
        ),
      },
      {
        id: 'token-rejected',
        title: 'Token rejected',
        description: 'The backend refused the saved token; the Alert sits above the token form.',
        render: () => (
          <BackendConnectionPanel
            clientName="this desktop client"
            baseUrl="http://localhost:7001"
            token="tfk_live_3f9a2c7e51b8"
            wsState="closed"
            unauthorized
            {...handlers}
          />
        ),
      },
      {
        id: 'nothing-saved',
        title: 'Nothing saved',
        description: 'No URL or token yet: both rows say Not set, Test and Reset all are off.',
        render: () => (
          <BackendConnectionPanel
            clientName="this desktop client"
            baseUrl={null}
            token={null}
            wsState="idle"
            unauthorized={false}
            {...handlers}
          />
        ),
      },
    ],
  },
]
