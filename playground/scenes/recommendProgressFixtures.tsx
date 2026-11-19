import { useState, type ReactNode } from 'react'
import { useApi } from '../../src/headless/api/ApiContext'
import type { CatalogBuildProgress } from '../../src/headless/api/generated'
import { OnFixtures } from './onFixtures'

const progress: CatalogBuildProgress = {
  phase: 'items',
  suppliersDone: 1,
  suppliersTotal: 2,
  itemsSoFar: 1,
  suppliers: ['Chairs', 'Desks'],
  supplierStates: { Chairs: 'done', Desks: 'gathering' },
  categoryResult: {
    categoryPath: ['Chairs'],
    status: 'completed',
    items: [
      {
        key: 'chair',
        identity: { name: 'Oak chair' },
        categoryPaths: [['Chairs']],
        summary: 'Solid oak with a woven seat.',
        description: '',
        composition: {},
        offers: [],
        criteria: {},
        sources: [],
        freshness: {},
      },
    ],
  },
}

/** Settles on one chair while Desks is gathering. Each press adds the desk checkpoint, no clock. */
function Advance({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  const [advanced, setAdvanced] = useState(false)
  return (
    <>
      <button
        onClick={() => {
          const next = {
            ...progress,
            suppliersDone: 2,
            itemsSoFar: 2,
            supplierStates: { Chairs: 'done', Desks: 'done' },
            categoryResult: {
              categoryPath: ['Desks'],
              status: 'deadline',
              items: [
                {
                  ...progress.categoryResult!.items[0],
                  key: 'desk',
                  identity: { name: 'Writing desk' },
                  summary: 'Compact desk, recovered before the deadline.',
                },
              ],
            },
          }
          ;(ws as unknown as { onMessage: (event: { data: string }) => void }).onMessage({
            data: JSON.stringify({
              event: 'recommend:progress',
              data: {
                projectId: RECOMMEND_PROJECT_ID,
                activityId: 'catalog-live',
                recordType: 'products',
                stepKey: 'gather',
                progress: next,
              },
            }),
          })
          setAdvanced(true)
        }}
      >
        Receive next category
      </button>
      {advanced ? <p>Second checkpoint received</p> : null}
      {children}
    </>
  )
}

export function RecommendProgressFixtures({ children }: { children: ReactNode }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/projects/{projectId}/activities/{activityId}': () => ({
          activityId: 'catalog-live',
          scope: RECOMMEND_PROJECT_ID,
          recordType: 'products',
          status: 'running',
          steps: [{ key: 'gather', done: 1, total: 2, status: 'running' }],
          startedAt: '2026-11-01',
          updatedAt: '2026-11-01',
        }),
        '/api/v1/projects/{projectId}/data': () => [{ content: progress }],
      }}
    >
      <Advance>{children}</Advance>
    </OnFixtures>
  )
}

export const RECOMMEND_PROJECT_ID = 'osc-web'

export const RECOMMEND_PREVIEW = {
  toolCall: {
    toolCallId: 'catalog-preview',
    name: 'getActivity',
    arguments: { activityId: 'catalog-live' },
  },
  result: {
    activityId: 'catalog-live',
    activityType: 'build-catalog',
    recordType: 'products',
    status: 'running',
  },
  resultType: 'success' as const,
}
