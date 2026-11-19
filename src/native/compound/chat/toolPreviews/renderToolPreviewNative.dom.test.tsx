import type { ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { RecommendProgressData } from '../../../../headless/api/generated'
import { WsClient } from '../../../../headless/api/WsClient'
import ToolPreviewSheet from '../ToolCall/ToolPreviewSheet'
import { renderToolPreviewNative } from './renderToolPreviewNative'

const mocks = vi.hoisted(() => ({ ws: {} as WsClient, read: vi.fn(), records: vi.fn() }))
vi.mock('../../../../headless/api/ApiContext', async (original) => ({
  ...(await original<typeof import('../../../../headless/api/ApiContext')>()),
  useOptionalApi: () => ({ ws: mocks.ws }),
}))
vi.mock('../../../../headless/api/generated', async (original) => ({
  ...(await original<typeof import('../../../../headless/api/generated')>()),
  getActivity: mocks.read,
  listProjectData: mocks.records,
}))
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))
vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('../../../primitives/BottomSheet', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}))
vi.mock('../ToolCall/StatusIcon', () => ({ StatusIcon: () => null, statusVisual: () => null }))
vi.mock('../TicketStatusMoveCard', () => ({}))
vi.mock('../TicketStoryProposalCard', () => ({}))
vi.mock('../../FeatureRequestBriefCard', () => ({ default: () => null }))
vi.mock('../../PathDisplay', () => ({}))
vi.mock('../../Code', () => ({ default: () => null }))
vi.mock('./TrainerSuggestionLaunch', () => ({ default: () => null }))
vi.mock('./WriteToolsPreview', () => ({}))
vi.mock('./WriteMultiToolsPreview', () => ({}))

afterEach(cleanup)

const projectId = 'chat-project'
const activityId = 'catalog-live'
const chair = {
  key: 'chair',
  identity: { name: 'Oak chair' },
  categoryPaths: [['Chairs']],
  summary: 'Solid oak',
  description: '',
  composition: {},
  offers: [],
  criteria: {},
  sources: [],
  freshness: {},
}
const checkpoint: RecommendProgressData['progress'] = {
  phase: 'items',
  suppliersDone: 1,
  suppliersTotal: 2,
  itemsSoFar: 1,
  suppliers: ['Chairs', 'Desks'],
  supplierStates: { Chairs: 'done', Desks: 'gathering' },
  categoryResult: { categoryPath: ['Chairs'], status: 'completed', items: [chair] },
}

it('loads and streams catalog results in a sheet outside ChatBody using the host chat project', async () => {
  mocks.ws = new WsClient({ baseUrl: '', getToken: () => null })
  mocks.read.mockResolvedValue({
    data: { recordType: 'products', status: 'running', steps: [{ key: 'gather' }] },
  })
  mocks.records.mockResolvedValue({ data: [{ content: checkpoint }] })
  render(
    <ToolPreviewSheet
      isOpen
      onClose={() => {}}
      toolCall={{ toolCallId: 'lookup', name: 'getActivity', arguments: { activityId } }}
      result={{
        activityId,
        activityType: 'build-catalog',
        recordType: 'products',
        status: 'running',
      }}
      resultType="success"
      renderResult={(args) => renderToolPreviewNative({ ...args, projectId })}
    />,
  )

  await screen.findByText('Oak chair')
  expect(mocks.read).toHaveBeenCalledWith({ path: { projectId, activityId }, throwOnError: true })
  expect(mocks.records).toHaveBeenCalledWith({
    path: { projectId },
    query: { type: 'products-progress', key: activityId },
    throwOnError: true,
  })
  const next: RecommendProgressData = {
    projectId,
    activityId,
    recordType: 'products',
    stepKey: 'gather',
    progress: {
      ...checkpoint,
      suppliersDone: 2,
      itemsSoFar: 2,
      supplierStates: { Chairs: 'done', Desks: 'done' },
      categoryResult: {
        categoryPath: ['Desks'],
        status: 'deadline',
        items: [{ ...chair, key: 'desk', identity: { name: 'Writing desk' } }],
      },
    },
  }
  const emit = (data: RecommendProgressData) => {
    const socket = mocks.ws as unknown as { onMessage: (event: { data: string }) => void }
    act(() => socket.onMessage({ data: JSON.stringify({ event: 'recommend:progress', data }) }))
  }
  emit({ ...next, projectId: 'other-project' })
  expect(screen.queryByText('Writing desk')).toBeNull()
  emit(next)
  expect(screen.getByText('Writing desk')).toBeTruthy()
  expect(screen.getByText('Oak chair')).toBeTruthy()
  expect(screen.getByText(/Deadline reached/)).toBeTruthy()
})
