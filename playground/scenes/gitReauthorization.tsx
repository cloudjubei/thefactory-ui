import { useEffect } from 'react'
import { AxiosError } from 'axios'
import { GitCredentialsProvider } from 'thefactory-ui/headless'
import { GitCredentialsSettings } from 'thefactory-ui/web'
import { client } from '../../src/headless/api/generated/client.gen'
import type { Scene } from '../showcase/types'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

const routes: FixtureRoutes = {
  '/api/v1/git-credentials': () => [
    {
      id: 'github-work',
      name: 'GitHub — work',
      username: 'alex-work',
      email: 'alex@example.com',
      host: 'github.com',
      hasToken: true,
      tokenSource: 'oauth',
    },
    {
      id: 'azure',
      name: 'Azure DevOps',
      username: 'alex',
      email: 'alex@example.com',
      host: 'dev.azure.com',
      hasToken: true,
      tokenSource: 'pat',
    },
  ],
}

/** Once mounted, one refused request; settled: only GitHub's row asks for re-authorization. */
function RefusedRequest() {
  useEffect(() => {
    void client.instance
      .get('/fixture/git-push', {
        adapter: async (config) => {
          throw new AxiosError('Git credential expired', undefined, config, undefined, {
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
            data: {
              reason: 're-authorize',
              credentialId: 'github-work',
              code: 'GIT_CREDENTIAL_ERROR',
            },
          })
        },
      })
      .catch(() => {
        /* The operation's inline error is outside this settings scene. */
      })
  }, [])
  return null
}

function Settings({ narrow = false }: { narrow?: boolean }) {
  return (
    <OnFixtures routes={routes}>
      <GitCredentialsProvider>
        <RefusedRequest />
        <div className={narrow ? 'w-[390px] max-w-full p-3' : 'w-[760px] max-w-full p-4'}>
          <GitCredentialsSettings />
        </div>
      </GitCredentialsProvider>
    </OnFixtures>
  )
}

export const GIT_REAUTHORIZATION_SCENES: Scene[] = [
  {
    id: 'git-reauthorization',
    title: 'Git credential re-authorization',
    component: 'GitCredentialsSettings',
    group: 'Settings',
    description:
      'A request refuses one OAuth credential, not the app bearer. The matching settings row offers sign-in again; the other account stays unchanged.',
    states: [
      { id: 'refused', title: 'OAuth refresh refused', render: () => <Settings /> },
      {
        id: 'refused-narrow',
        title: 'OAuth refresh refused, narrow',
        render: () => <Settings narrow />,
      },
    ],
  },
]
