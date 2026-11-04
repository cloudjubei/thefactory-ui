#!/usr/bin/env node
import { startFakeBackendCli } from './fakeBackendCli'

startFakeBackendCli(process.argv.slice(2), process.env, console.log).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
