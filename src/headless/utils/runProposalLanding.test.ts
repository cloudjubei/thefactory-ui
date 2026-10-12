import { describe, expect, it } from 'vitest'
import { PROCESS_INTEGRATION_FORM_NO_TITLE } from 'thefactory-tools/constants'
import type { ProcessIntegrationOptions } from 'thefactory-tools/types'

import {
  runProposalLanding,
  runProposalLandingEdits,
  runProposalLandingForm,
  runProposalLandingLine,
  runProposalLandingProblem,
  runProposalLandingWithMode,
} from './runProposalLanding'
import { RUN_PROPOSAL_LANDING_SHADOW } from './runProposalViewConstants'

const bot = {
  name: 'acme-bot',
  email: 'bot@acme.io',
  credentialId: 'acme',
  label: 'Acme bot',
  username: 'acme-bot',
  host: 'github.com',
  isProjectDefault: true,
}
const kamil = {
  ...bot,
  name: 'Kamil',
  email: 'k@acme.io',
  credentialId: 'kamil',
  isProjectDefault: false,
}

const options: ProcessIntegrationOptions = {
  title: 'Read PDFs',
  commits: ['Read PDFs'],
  fastForward: true,
  identities: [bot, kamil],
  accounts: [
    {
      credentialId: 'acme',
      label: 'Acme bot',
      username: 'acme-bot',
      host: 'github.com',
      isProjectDefault: true,
    },
  ],
  defaults: {
    merge: 'Merge factory/read-pdfs: Read PDFs',
    squash: 'Read PDFs',
    pullRequest: { title: 'Read PDFs', body: 'Body' },
  },
}

const detail = {
  mode: 'squash',
  modes: ['merge', 'squash', 'pull-request'],
  workBranch: 'factory/read-pdfs',
  baseRef: 'main',
  commitAs: { credentialId: 'kamil', name: 'Kamil', email: 'k@acme.io' },
  message: 'Squashed by the agent',
  buildFirst: false,
  options,
}

describe('runProposalLanding', () => {
  it('reads how the host said the work lands, with what it could land as', () => {
    expect(runProposalLanding(detail)).toEqual({
      mode: 'squash',
      modes: ['merge', 'squash', 'pull-request'],
      workBranch: 'factory/read-pdfs',
      baseRef: 'main',
      shadow: false,
      commitAs: 'kamil',
      commitAsLabel: 'Kamil <k@acme.io>',
      message: 'Squashed by the agent',
      buildFirst: false,
      options,
    })
  })

  it('reads where the base already holds the work, when approving merges nothing', () => {
    const landedBy = { commit: '1d1ed0a8841681a62be9ccb503bffaee08dedbd8', subject: 'notes' }
    expect(runProposalLanding({ ...detail, alreadyOnBase: landedBy })?.alreadyOnBase).toEqual(
      landedBy,
    )
  })

  it('is nothing when the host stated no landing', () => {
    expect(runProposalLanding(undefined)).toBeUndefined()
    expect(runProposalLanding({ mode: 'rebase' })).toBeUndefined()
  })
})

describe('runProposalLandingForm', () => {
  it('starts from exactly what the card states', () => {
    expect(runProposalLandingForm(runProposalLanding(detail)!)).toMatchObject({
      mode: 'squash',
      identityId: 'kamil',
      message: 'Squashed by the agent',
      checkMerge: false,
    })
  })

  it('starts with the result checked when the card does not say', () => {
    const { buildFirst: _unsaid, ...unsaid } = detail
    expect(runProposalLandingForm(runProposalLanding(unsaid)!)?.checkMerge).toBe(true)
  })

  it('is nothing for a project with no git of its own — there is nothing to choose', () => {
    expect(
      runProposalLandingForm(runProposalLanding({ ...detail, shadow: true, options: undefined })!),
    ).toBeUndefined()
  })
})

describe('runProposalLandingForm — work its base already holds', () => {
  it('is nothing — approving merges nothing, so there is nothing to choose', () => {
    const landing = runProposalLanding({
      ...detail,
      alreadyOnBase: { commit: '1d1ed0a8841681a62be9ccb503bffaee08dedbd8' },
    })!
    expect(runProposalLandingForm(landing)).toBeUndefined()
  })
})

describe('runProposalLandingLine — work its base already holds', () => {
  it('says there is nothing to merge, and since when the base held it', () => {
    const landing = runProposalLanding({
      ...detail,
      alreadyOnBase: { commit: '1d1ed0a8841681a62be9ccb503bffaee08dedbd8', subject: 'notes' },
    })!
    expect(runProposalLandingLine(landing, undefined)).toBe(
      'Nothing to merge — this work was already on main (since 1d1ed0a “notes”).',
    )
  })
})

describe('runProposalLandingWithMode', () => {
  it('starts another way from that way’s own words, keeping who it is made as', () => {
    const form = runProposalLandingForm(runProposalLanding(detail)!)!
    expect(runProposalLandingWithMode(form, 'merge', options)).toMatchObject({
      mode: 'merge',
      identityId: 'kamil',
      message: 'Merge factory/read-pdfs: Read PDFs',
    })
  })
})

describe('runProposalLandingEdits', () => {
  const landing = runProposalLanding(detail)!

  it('carries nothing when the person changed nothing', () => {
    expect(runProposalLandingEdits(landing, runProposalLandingForm(landing)!)).toBeUndefined()
  })

  it('carries the whole landing as the person set it, for its way', () => {
    const form = { ...runProposalLandingForm(landing)!, identityId: 'acme' }
    expect(runProposalLandingEdits(landing, form)).toEqual({
      args: {
        mode: 'squash',
        commitAs: 'acme',
        message: 'Squashed by the agent',
        buildFirst: false,
      },
    })
  })

  it('carries the check of the result turned on', () => {
    const form = { ...runProposalLandingForm(landing)!, checkMerge: true }
    expect(runProposalLandingEdits(landing, form)?.args).toMatchObject({ buildFirst: true })
  })

  it('carries a pull request’s account and words when the way changed to one', () => {
    const form = runProposalLandingWithMode(
      runProposalLandingForm(landing)!,
      'pull-request',
      options,
    )
    expect(runProposalLandingEdits(landing, form)).toEqual({
      args: {
        mode: 'pull-request',
        pullRequestAccount: 'acme',
        pullRequestTitle: 'Read PDFs',
        pullRequestBody: 'Body',
      },
    })
  })
})

describe('runProposalLandingProblem', () => {
  it('says what stops the landing being sent, as the sign-off would', () => {
    const form = runProposalLandingWithMode(
      runProposalLandingForm(runProposalLanding(detail)!)!,
      'pull-request',
      options,
    )
    expect(runProposalLandingProblem({ ...form, prTitle: ' ' }, options)).toBe(
      PROCESS_INTEGRATION_FORM_NO_TITLE,
    )
    expect(runProposalLandingProblem(form, options)).toBeUndefined()
  })
})

describe('runProposalLandingLine', () => {
  const landing = runProposalLanding(detail)!

  it('says a merge or squash by the way, the branch and who it is made as', () => {
    expect(runProposalLandingLine(landing, runProposalLandingForm(landing))).toBe(
      'Merge as one commit into main, as Kamil <k@acme.io>',
    )
  })

  it('says when the result is built and type-checked before it lands', () => {
    const form = { ...runProposalLandingForm(landing)!, checkMerge: true }
    expect(runProposalLandingLine(landing, form)).toBe(
      'Merge as one commit into main, as Kamil <k@acme.io>, built and type-checked first',
    )
  })

  it('says a pull request by the account it is opened as', () => {
    const form = runProposalLandingWithMode(
      runProposalLandingForm(landing)!,
      'pull-request',
      options,
    )
    expect(runProposalLandingLine(landing, form)).toBe(
      'Pull request into main, opened as acme-bot — “Read PDFs”',
    )
  })

  it('says work brought into a folder with no git of its own without git words', () => {
    const shadow = runProposalLanding({ ...detail, shadow: true, options: undefined })!
    expect(runProposalLandingLine(shadow, undefined)).toBe(RUN_PROPOSAL_LANDING_SHADOW)
  })

  it('reads what the host stated when there are no options to edit', () => {
    const bare = runProposalLanding({ ...detail, options: undefined })!
    expect(runProposalLandingLine(bare, undefined)).toBe(
      'Merge as one commit into main, as Kamil <k@acme.io>',
    )
  })
})
