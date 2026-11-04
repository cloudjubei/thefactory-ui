import type { GetProjectKnowledgeOverviewResponse } from '../../headless/api/generated/types.gen'

type ProjectOverview = NonNullable<GetProjectKnowledgeOverviewResponse['overview']>

type Claim = ProjectOverview['purpose']

export const EARLIER = '2026-10-23T08:10:00.000Z'

export const claim = (
  text: string,
  citations: string[] = [],
  label: Claim['label'] = 'observed',
) => ({
  text,
  label,
  citations,
})

export const fresh = (refreshedAt: string, stale = false) => ({
  refreshedAt,
  contentKey: 'a',
  currentContentKey: stale ? 'b' : 'a',
  stale,
})

export const code = (itemId: string, name: string, path: string, line?: number) => ({
  itemId,
  name,
  level: 1,
  path,
  ...(line !== undefined ? { line } : {}),
  hierarchyPath: [],
  files: [path],
})

export const area = (itemId: string, name: string) => ({
  itemId,
  name,
  level: 2,
  hierarchyPath: [],
})

export function codeOnlyOverview(): ProjectOverview {
  return {
    formatVersion: 3,
    projectId: 'thefactory-db',
    purpose: claim(
      'thefactory-db — Local-first PostgreSQL toolkit with hybrid text and vector search, Docker-managed databases, and a TypeScript API for documents and entities.',
      ['c4_root'],
      'derived',
    ),
    capabilities: [
      {
        id: 'area:src/chunking/',
        name: 'chunking',
        claim: claim(
          '6 files: dataSummary.ts, chunkDocument.ts, codeChunker.ts and 3 more. Most referenced: chunkDocument — the pieces of a document to embed.',
          ['area:src/chunking/', 'u_chunk'],
        ),
      },
      {
        id: 'area:src/client/documents.ts',
        name: 'client / documents',
        claim: claim('One file, documents.ts, with 23 definitions. Most referenced: addDocument.', [
          'u_add',
        ]),
      },
      {
        id: 'area:src/migrations/',
        name: 'migrations',
        claim: claim('9 files: runner.ts, 001-init.ts and 7 more.', ['u_migrate']),
      },
    ],
    modules: [
      {
        id: 'area:src/client/',
        name: 'client',
        claim: claim('5 files: documents.ts, entities.ts, entityQuery.ts and 2 more.', ['u_add']),
      },
      {
        id: 'area:src/*',
        name: 'src',
        claim: claim('6 files: validation.ts, runtime.ts, utils.ts and 3 more.', ['u_runtime']),
      },
    ],
    recordedWork: { stories: [], openStories: 0, totalStories: 6 },
    documentWork: [],
    documentWorkStatus: claim(
      'No plan documents or imported tickets were found; documented work is unknown.',
      [],
      'abstain',
    ),
    omitted: { capabilities: 3, modules: 0, documentWork: 0 },
    citations: {
      c4_root: area('c4_root', 'thefactory-db'),
      u_chunk: code('u_chunk', 'chunkDocument', 'src/chunking/chunkDocument.ts', 31),
      u_add: code('u_add', 'addDocument', 'src/client/documents.ts', 58),
      u_migrate: code('u_migrate', 'migrateDatabase', 'src/migrations/runner.ts', 12),
      u_runtime: code('u_runtime', 'createReusableDatabase', 'src/runtime.ts', 140),
    },
    sections: {
      purpose: fresh(EARLIER),
      capabilities: fresh(EARLIER),
      modules: fresh(EARLIER),
      recordedWork: fresh(EARLIER),
      documentWork: fresh(EARLIER),
    },
    provenance: { source: 'heuristic', refreshedAt: EARLIER, contentKey: 'k' },
  }
}
