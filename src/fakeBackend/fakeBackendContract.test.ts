import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const TYPES = join(ROOT, 'src/headless/api/generated/types.gen.ts')
const ROUTES = join(ROOT, 'src/fakeBackend/fakeBackendRoutes.ts')
const COMPILE_TIMEOUT_MS = 120_000

const { options } = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  ROOT,
)
const parsed = new Map<string, ts.SourceFile | undefined>()

/** The route table and its fixtures compiled against a changed copy of the generated contract. */
function compileAgainst(change: (types: string) => string): string[] {
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, languageVersion) => {
    if (fileName === TYPES) {
      return ts.createSourceFile(fileName, change(ts.sys.readFile(TYPES) ?? ''), languageVersion)
    }
    if (!parsed.has(fileName)) parsed.set(fileName, getSourceFile(fileName, languageVersion))
    return parsed.get(fileName)
  }
  const program = ts.createProgram({ rootNames: [ROUTES], options, host })
  return ts
    .getPreEmitDiagnostics(program)
    .map(
      ({ file, messageText }) =>
        `${file ? relative(ROOT, file.fileName) : ''}: ${ts.flattenDiagnosticMessageText(messageText, ' ')}`,
    )
}

function changed(types: string, from: string, to: string): string {
  if (!types.includes(from)) throw new Error(`The contract no longer holds: ${from}`)
  return types.replace(from, to)
}

describe('the fixtures against the API contract', () => {
  it(
    'compile as the contract stands',
    () => {
      expect(compileAgainst((types) => types)).toEqual([])
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when a response gains a required field',
    () => {
      const errors = compileAgainst((types) =>
        changed(
          types,
          'export type OverseerState = {',
          'export type OverseerState = {\n  addedByContract: string',
        ),
      )
      expect(errors.join('\n')).toMatch(/src\/fakeBackend\/fixtures\/account\.ts.*addedByContract/)
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when a field a scene fixture holds is renamed',
    () => {
      const errors = compileAgainst((types) =>
        changed(
          types,
          'export type FeatureRequest = {\n  title: string',
          'export type FeatureRequest = {\n  heading: string',
        ),
      )
      expect(errors.join('\n')).toContain('src/fakeBackend/fixtures/featureRequests.ts')
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when a field changes type',
    () => {
      const errors = compileAgainst((types) =>
        changed(
          types,
          'export type GitLogCommit = {\n  hash: string',
          'export type GitLogCommit = {\n  hash: number',
        ),
      )
      expect(errors.join('\n')).toContain('src/fakeBackend/fixtures/git.ts')
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when a route moves',
    () => {
      const errors = compileAgainst((types) =>
        changed(types, "url: '/api/v1/tools/chat-catalog'", "url: '/api/v2/tools/chat-catalog'"),
      )
      expect(errors.join('\n')).toContain('src/fakeBackend/fakeBackendRoutes.ts')
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when an operation goes',
    () => {
      const errors = compileAgainst((types) =>
        changed(types, 'export type ListTemplatesData =', 'export type ListTemplatesGoneData ='),
      )
      expect(errors.join('\n')).toMatch(/fakeBackendRoutes\.ts.*ListTemplatesData/)
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when a route answers another shape, catalogue rows included',
    () => {
      const errors = compileAgainst((types) =>
        changed(
          types,
          'export type ListChatToolCatalogResponses = {\n  /**\n   * Default Response\n   */\n  200: Array<{\n    name: string',
          'export type ListChatToolCatalogResponses = {\n  /**\n   * Default Response\n   */\n  200: Array<{\n    toolName: string',
        ),
      )
      expect(errors.join('\n')).toContain('src/fakeBackend/fixtures/chatToolCatalog.ts')
    },
    COMPILE_TIMEOUT_MS,
  )

  it(
    'fail when a chat context type is added that the settings do not cover',
    () => {
      const errors = compileAgainst((types) =>
        changed(
          types,
          "export type ChatContext = {\n  type:\n    | 'GENERAL'",
          "export type ChatContext = {\n  type:\n    | 'ADDED_BY_CONTRACT'\n    | 'GENERAL'",
        ),
      )
      expect(errors.join('\n')).toMatch(/fixtures\/chats\.ts.*ADDED_BY_CONTRACT/)
    },
    COMPILE_TIMEOUT_MS,
  )
})
