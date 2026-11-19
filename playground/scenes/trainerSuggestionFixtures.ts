import { formatResourceLink } from 'thefactory-tools/utils'

/** Identical recommendation content and transport answers on base and head. */
export const TRAINER_RESULT = {
  accepted: 2,
  skippedExisting: 1,
  recordType: 'cartpole-run',
  viewLink: formatResourceLink({ kind: 'app', projectId: 'training', view: 'xai' }),
  suggestions: [
    {
      id: 'learning-rate',
      title: 'Compare learning rates',
      rationale: 'Check whether a smaller step improves stability.',
      spec: { sweep: { learningRate: [0.001, 0.0003] }, seeds: [1, 2, 3] },
    },
    {
      id: 'batch-size',
      title: 'Compare batch sizes',
      rationale: 'Hold the learning rate fixed and vary the batch.',
      spec: { sweep: { batchSize: [32, 64] }, seeds: [1, 2, 3] },
    },
  ],
}

/**
 * Manual preview stays ready until pressed, then settles at Running, train 2/6.
 * Intentionally constant: no socket, independent activity ids or real training lifecycle.
 * A fresh page resets the session store. Auto-launch 2/1 suppress Launch on head; 0 retains it.
 */
export const TRAINER_ROUTES = {
  'POST /api/v1/projects/{projectId}/trainer-suggestions/{suggestionId}/launch': () => ({
    activityId: 'train-1',
    queued: false,
  }),
  '/api/v1/projects/{projectId}/activities/{activityId}': () => ({
    activityId: 'train-1',
    scope: 'training',
    recordType: 'training-run',
    status: 'running',
    isLive: true,
    startedAt: '2026-11-01T09:00:00Z',
    updatedAt: '2026-11-01T09:01:00Z',
    steps: [{ key: 'train', status: 'running', done: 2, total: 6 }],
  }),
}
