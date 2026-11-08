import { randomUUID } from 'node:crypto'
import { FAKE_BACKEND_TOKEN_PREFIX } from './fakeBackendConstants'
import { fakeBackendRoutes } from './fakeBackendRoutes'
import { FakeBackendServer } from './FakeBackendServer'
import { readFakeBackendOptions } from './fakeBackendUtils'

/** Starts the fake from a command line. A token it was told stays out of its output. */
export async function startFakeBackendCli(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  log: (line: string) => void,
): Promise<FakeBackendServer> {
  const { port, token, tokenGenerated } = readFakeBackendOptions(
    argv,
    env,
    () => `${FAKE_BACKEND_TOKEN_PREFIX}${randomUUID()}`,
  )
  const server = new FakeBackendServer({ token, port, routes: fakeBackendRoutes(), log })
  await server.start()
  log(`Fake backend on ${server.url}`)
  if (tokenGenerated) log(`Throwaway token: ${token}`)
  return server
}
