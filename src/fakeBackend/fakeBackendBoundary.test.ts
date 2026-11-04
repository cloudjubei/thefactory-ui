import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FAKE_BACKEND_ROUTES } from './fakeBackendRoutes'
import { answerFakeRequest } from './fakeBackendUtils'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const HERE = join(ROOT, 'src/fakeBackend')
const TOKEN = 'fake-token'

const ALLOWED_RUNTIME_IMPORTS = ['node:http', 'node:crypto', 'node:stream']

const sourcesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourcesUnder(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })

const isTest = (path: string) => /\.test\.tsx?$/.test(path)
const fakeSources = () => sourcesUnder(HERE).filter((path) => !isTest(path))
const read = (path: string) => readFileSync(path, 'utf8')

/** Each `from '…'` of a file, kept with whether the statement is erased at build. */
const importsOf = (source: string) =>
  [...source.matchAll(/^(import|export)( type)?[^'"]*?from '([^']+)'/gm)].map((match) => ({
    typeOnly: match[2] !== undefined,
    from: match[3] ?? '',
  }))

describe('reaching nothing outside itself', () => {
  it('imports nothing at run time but the node modules a local server needs', () => {
    const external = fakeSources().flatMap((path) =>
      importsOf(read(path))
        .filter(({ typeOnly, from }) => !typeOnly && !from.startsWith('.'))
        .map(({ from }) => from),
    )
    expect(
      [...new Set(external)].filter((from) => !ALLOWED_RUNTIME_IMPORTS.includes(from)),
    ).toEqual([])
  })

  it('takes nothing from the rest of the package at run time', () => {
    const outside = fakeSources().flatMap((path) =>
      importsOf(read(path))
        .filter(({ typeOnly, from }) => !typeOnly && from.includes('headless'))
        .map(({ from }) => `${relative(ROOT, path)}: ${from}`),
    )
    expect(outside).toEqual([])
  })

  it('makes no outgoing call', () => {
    const calling = fakeSources().filter((path) =>
      /\b(fetch|XMLHttpRequest|WebSocket|request|connect)\(|https?\.get\(/.test(
        read(path).replace(/\/\*[\s\S]*?\*\//g, ''),
      ),
    )
    expect(calling.map((path) => relative(ROOT, path))).toEqual([])
  })

  it('never names the real backend', () => {
    const naming = fakeSources().filter((path) => /localhost|:7001\b/.test(read(path)))
    expect(naming.map((path) => relative(ROOT, path))).toEqual([])
  })
})

describe('holding no real credential', () => {
  it('has nothing shaped like a key in its source', () => {
    const shaped = fakeSources().filter((path) =>
      /\b(sk-[a-z]{2,}-|sk-[A-Za-z0-9]{16,}|ghp_|gho_|github_pat_|xox[bp]-|AKIA[0-9A-Z]{8,})/.test(
        read(path),
      ),
    )
    expect(shaped.map((path) => relative(ROOT, path))).toEqual([])
  })

  it('answers no secret field on any route it can read without a parameter', () => {
    const answers = FAKE_BACKEND_ROUTES.filter(
      ({ method, path }) => method === 'GET' && !path.includes('{'),
    ).map(({ path }) =>
      JSON.stringify(
        answerFakeRequest(
          {
            method: 'GET',
            pathname: path,
            query: new URLSearchParams(),
            authorization: `Bearer ${TOKEN}`,
            body: undefined,
          },
          { routes: FAKE_BACKEND_ROUTES, token: TOKEN },
        ).body,
      ),
    )
    expect(answers.length).toBeGreaterThan(20)
    expect(answers.join('\n')).not.toMatch(/"(apiKey|token|password|secret|refreshToken)":/)
  })
})

describe('staying out of what the clients ship', () => {
  const packageJson = JSON.parse(read(join(ROOT, 'package.json'))) as {
    bin: Record<string, string>
    exports: Record<string, unknown>
  }
  const tsup = read(join(ROOT, 'tsup.config.ts'))

  it('is reached by no other source of the package', () => {
    const reaching = sourcesUnder(join(ROOT, 'src'))
      .filter((path) => !path.startsWith(HERE))
      .filter((path) => importsOf(read(path)).some(({ from }) => from.includes('fakeBackend')))
    expect(reaching.map((path) => relative(ROOT, path))).toEqual([])
  })

  it('is no export of the package', () => {
    expect(JSON.stringify(packageJson.exports)).not.toContain('fake')
  })

  it('ships as a bin, built from its own entry', () => {
    expect(packageJson.bin['thefactory-fake-backend']).toBe('./dist/fake-backend/cli.js')
    expect(tsup).toContain("'fake-backend/cli': 'src/fakeBackend/cli.ts'")
  })

  it('is reached by the playground only through its fixtures', () => {
    const reaching = sourcesUnder(join(ROOT, 'playground')).flatMap((path) =>
      importsOf(read(path))
        .map(({ from }) => from)
        .filter((from) => from.includes('fakeBackend') && !from.includes('fakeBackend/fixtures/')),
    )
    expect(reaching).toEqual([])
  })
})
