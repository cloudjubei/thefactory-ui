import type { FeatureRequest } from '../../headless/api/generated/types.gen'

export const BACKEND_REQUEST = {
  id: '8a95cafa-96a2-4dcd-b7e6-124f6cd16764',
  title: 'Wire human-approved stopActivity across all background activities',
  summary:
    'Register stopActivity for API and CLI agents behind a person’s approval, with trusted card details, and route every stop through one shared cancellation path.',
  targetProjectId: 'thefactory-backend',
  requestedBy: {
    fromProjectId: 'thefactory-tools',
    fromChatContext: { type: 'PROJECT', projectId: 'thefactory-tools' },
  },
  acceptance: 'manual',
  status: 'blocked',
  statusReason:
    '3 of 5 features are blocked: Define upstream cancellation and approval-card contracts.',
  handling: { storyId: '8f9c5993-8463-46c1-98f7-cbd25a019211' },
  createdAt: '2026-10-17T09:12:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
} satisfies FeatureRequest

export const UI_REQUEST = {
  ...BACKEND_REQUEST,
  id: '1f88f34d-532a-45e0-a72f-1c804c5e6112',
  title: 'Shared stopActivity approval card and adoption in derived apps',
  summary:
    'Show a reusable approval card for stopActivity on web and native, from host-supplied facts, and carry it into the apps built on it.',
  targetProjectId: 'thefactory-ui',
  statusReason:
    '3 of 5 features are blocked: Discover approval consumers and coordinate the trusted backend contract.',
  handling: { storyId: '2d20d84b-5ec6-4054-bbb5-1eedf9e41861' },
} satisfies FeatureRequest

export const FAKE_FEATURE_REQUESTS: FeatureRequest[] = [BACKEND_REQUEST, UI_REQUEST]
