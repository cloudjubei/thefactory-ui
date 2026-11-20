import type { ProcessNamedLandingAction } from 'thefactory-ui/headless'

const idle: ProcessNamedLandingAction = { busy: false, error: null, onSettle: async () => true }

/** One state of "Merged another way?": what is typed, and how its action stands. */
export type NamedLandingState = { action: ProcessNamedLandingAction; text?: string }

/** "Merged another way?" in each state: what is typed, whether it goes, and why it was refused. */
export const NAMED_LANDING_STATES = {
  closed: { action: idle },
  link: { action: idle, text: 'https://github.com/example/shop-api/pull/394' },
  commit: { action: idle, text: '3e4fcebd2a91' },
  'two-things': { action: idle, text: '3e4fcebd 2fbbceb0' },
  finishing: {
    action: { ...idle, busy: true },
    text: 'https://github.com/example/shop-api/pull/394',
  },
  refused: {
    action: {
      ...idle,
      error:
        'https://github.com/example/shop-api/pull/394 is not merged into dev, so it cannot have brought the work in.',
    },
    text: 'https://github.com/example/shop-api/pull/394',
  },
} satisfies Record<string, NamedLandingState>

export type NamedLandingStateId = keyof typeof NAMED_LANDING_STATES

export const NAMED_LANDING_STATE_TEXT: Record<
  NamedLandingStateId,
  { title: string; description: string }
> = {
  closed: {
    title: 'Closed',
    description:
      'One quiet button where the run takes it: at its sign-off, once stopped, or approved and not merged.',
  },
  link: {
    title: 'A pull request link',
    description: 'The merged pull request that brought the work in. Finish as merged asks first.',
  },
  commit: {
    title: 'A commit',
    description: 'The commit on the base that has the work, when no pull request did.',
  },
  'two-things': {
    title: 'Two things at once',
    description: 'Only one link or one commit: the field says so and nothing can be sent.',
  },
  finishing: {
    title: 'Finishing',
    description: 'Shown at once on the confirm; the field locks and a second press does nothing.',
  },
  refused: {
    title: 'Refused',
    description: 'The backend’s reason under the field, the text kept to fix.',
  },
}
