export const STORY_READINESS_COPY = {
  ready: 'Ready',
  notReady: (count: number): string => `Not ready · ${count}`,
  heading: 'What it lacks',
} as const
