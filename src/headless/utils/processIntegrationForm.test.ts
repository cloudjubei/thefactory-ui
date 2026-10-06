import { describe, expect, it } from 'vitest'
import type { ProcessIntegrationOptions } from 'thefactory-tools/types'

import {
  processIntegrationAccountLabel,
  processIntegrationFormDecision,
  processIntegrationFormPreview,
  processIntegrationFormStart,
  processIntegrationIdentityLabel,
} from './processIntegrationForm'
import {
  PROCESS_INTEGRATION_FORM_NO_ACCOUNT,
  PROCESS_INTEGRATION_FORM_NO_IDENTITY,
  PROCESS_INTEGRATION_FORM_NO_MESSAGE,
  PROCESS_INTEGRATION_FORM_NO_TITLE,
} from './processIntegrationFormConstants'

const workBranch = { name: 'factory/file-tools-04bd5862', baseRef: 'main' }

const projectBot = {
  name: 'acme-bot',
  email: 'bot@acme.io',
  credentialId: 'acme',
  label: 'Acme bot',
  username: 'acme-bot',
  host: 'github.com',
  isProjectDefault: true,
}
const kamil = {
  name: 'Kamil Chmurzynski',
  email: 'kamil@example.com',
  credentialId: 'kamil',
  label: 'Kamil on GitHub',
  username: 'kamil',
  host: 'github.com',
  isProjectDefault: false,
}

const options = (over: Partial<ProcessIntegrationOptions> = {}): ProcessIntegrationOptions => ({
  title: 'File tools: read PDFs',
  commits: ['Read PDFs — developer, attempt 1', 'Flag binaries — developer, attempt 1'],
  fastForward: false,
  identities: [projectBot, kamil],
  accounts: [
    {
      credentialId: 'acme',
      label: 'Acme bot',
      username: 'acme-bot',
      host: 'github.com',
      isProjectDefault: true,
    },
    {
      credentialId: 'kamil',
      label: 'Kamil on GitHub',
      username: 'kamil',
      host: 'github.com',
      isProjectDefault: false,
    },
  ],
  remoteHost: 'github.com',
  defaults: {
    merge: 'Merge factory/file-tools-04bd5862: File tools: read PDFs',
    squash: 'File tools: read PDFs\n\nReads PDFs and flags binaries.',
    pullRequest: { title: 'File tools: read PDFs', body: 'Reads PDFs.\n\n## Commits' },
  },
  ...over,
})

describe('processIntegrationFormStart', () => {
  it('starts a squash as the project’s identity with the story and the report', () => {
    expect(processIntegrationFormStart('squash', options())).toEqual({
      mode: 'squash',
      identityId: 'acme',
      message: 'File tools: read PDFs\n\nReads PDFs and flags binaries.',
      accountId: 'acme',
      prTitle: 'File tools: read PDFs',
      prBody: 'Reads PDFs.\n\n## Commits',
    })
  })

  it('starts a merge from its own message', () => {
    expect(processIntegrationFormStart('merge', options()).message).toBe(
      'Merge factory/file-tools-04bd5862: File tools: read PDFs',
    )
  })

  it('starts from what the person chose before for the same way', () => {
    const decided = options({
      decision: {
        mode: 'squash',
        identity: { name: kamil.name, email: kamil.email, credentialId: 'kamil' },
        message: 'Read PDFs',
      },
    })
    expect(processIntegrationFormStart('squash', decided)).toMatchObject({
      identityId: 'kamil',
      message: 'Read PDFs',
    })
  })

  it('keeps the identity chosen before but not its message when the way changes', () => {
    const decided = options({
      decision: {
        mode: 'squash',
        identity: { name: kamil.name, email: kamil.email, credentialId: 'kamil' },
        message: 'Read PDFs',
      },
    })
    expect(processIntegrationFormStart('merge', decided)).toMatchObject({
      identityId: 'kamil',
      message: 'Merge factory/file-tools-04bd5862: File tools: read PDFs',
    })
  })

  it('starts a pull request from what was chosen before for one', () => {
    const decided = options({
      decision: {
        mode: 'pull-request',
        credentialId: 'kamil',
        pullRequest: { title: 'PDFs', body: 'Body' },
      },
    })
    expect(processIntegrationFormStart('pull-request', decided)).toMatchObject({
      accountId: 'kamil',
      prTitle: 'PDFs',
      prBody: 'Body',
    })
  })

  it('does not start from an identity that is no longer offered', () => {
    const decided = options({
      decision: {
        mode: 'squash',
        identity: { name: 'Gone', email: 'g@x.io', credentialId: 'gone' },
      },
    })
    expect(processIntegrationFormStart('squash', decided).identityId).toBe('acme')
  })

  it('starts from the first identity when the project has none of its own', () => {
    const none = options({ identities: [{ ...kamil }], accounts: [] })
    expect(processIntegrationFormStart('squash', none)).toMatchObject({
      identityId: 'kamil',
    })
    expect(processIntegrationFormStart('squash', none).accountId).toBeUndefined()
  })
})

describe('processIntegrationFormDecision', () => {
  it('is a squash as the chosen identity with the message as written', () => {
    const form = { ...processIntegrationFormStart('squash', options()), identityId: 'kamil' }
    expect(processIntegrationFormDecision(form, options())).toEqual({
      decision: {
        mode: 'squash',
        identity: { name: 'Kamil Chmurzynski', email: 'kamil@example.com', credentialId: 'kamil' },
        message: 'File tools: read PDFs\n\nReads PDFs and flags binaries.',
      },
    })
  })

  it('drops the blank lines at the end of a message', () => {
    const form = { ...processIntegrationFormStart('merge', options()), message: 'Merge it\n\n  ' }
    expect(processIntegrationFormDecision(form, options())).toMatchObject({
      decision: { message: 'Merge it' },
    })
  })

  it('refuses a commit with no one to make it as', () => {
    const form = processIntegrationFormStart('squash', options({ identities: [] }))
    expect(processIntegrationFormDecision(form, options({ identities: [] }))).toEqual({
      problem: PROCESS_INTEGRATION_FORM_NO_IDENTITY,
    })
  })

  it('refuses an identity that is not offered', () => {
    const form = { ...processIntegrationFormStart('squash', options()), identityId: 'gone' }
    expect(processIntegrationFormDecision(form, options())).toEqual({
      problem: PROCESS_INTEGRATION_FORM_NO_IDENTITY,
    })
  })

  it('refuses an empty message', () => {
    const form = { ...processIntegrationFormStart('squash', options()), message: ' \n ' }
    expect(processIntegrationFormDecision(form, options())).toEqual({
      problem: PROCESS_INTEGRATION_FORM_NO_MESSAGE,
    })
  })

  it('is a pull request as the chosen account with its words', () => {
    const form = {
      ...processIntegrationFormStart('pull-request', options()),
      accountId: 'kamil',
      prTitle: ' PDFs ',
      prBody: 'Body\n',
    }
    expect(processIntegrationFormDecision(form, options())).toEqual({
      decision: {
        mode: 'pull-request',
        credentialId: 'kamil',
        pullRequest: { title: 'PDFs', body: 'Body' },
      },
    })
  })

  it('refuses a pull request with no account for the host', () => {
    const form = processIntegrationFormStart('pull-request', options({ accounts: [] }))
    expect(processIntegrationFormDecision(form, options({ accounts: [] }))).toEqual({
      problem: PROCESS_INTEGRATION_FORM_NO_ACCOUNT,
    })
  })

  it('refuses a pull request without a title', () => {
    const form = { ...processIntegrationFormStart('pull-request', options()), prTitle: '  ' }
    expect(processIntegrationFormDecision(form, options())).toEqual({
      problem: PROCESS_INTEGRATION_FORM_NO_TITLE,
    })
  })
})

describe('processIntegrationFormPreview', () => {
  it('shows a squash as one commit on GitHub, by the chosen identity', () => {
    const form = { ...processIntegrationFormStart('squash', options()), identityId: 'kamil' }
    expect(processIntegrationFormPreview(form, options(), workBranch)).toEqual({
      where: 'As it will show on GitHub',
      entries: [
        {
          title: 'File tools: read PDFs',
          body: 'Reads PDFs and flags binaries.',
          byline: 'Kamil Chmurzynski <kamil@example.com> committed',
        },
      ],
      note: 'One commit on main.',
    })
  })

  it('shows a merge onto a moved base as its merge commit, then the commits it brings', () => {
    const form = processIntegrationFormStart('merge', options())
    expect(processIntegrationFormPreview(form, options(), workBranch)).toEqual({
      where: 'As it will show on GitHub',
      entries: [
        {
          title: 'Merge factory/file-tools-04bd5862: File tools: read PDFs',
          byline: 'acme-bot <bot@acme.io> committed',
        },
        { title: 'Read PDFs — developer, attempt 1', byline: 'acme-bot <bot@acme.io> committed' },
        {
          title: 'Flag binaries — developer, attempt 1',
          byline: 'acme-bot <bot@acme.io> committed',
        },
      ],
      note: 'A merge commit joins the 2 commits to main.',
    })
  })

  it('shows a merge onto a base that has not moved as the commits alone', () => {
    const form = processIntegrationFormStart('merge', options({ fastForward: true }))
    const preview = processIntegrationFormPreview(form, options({ fastForward: true }), workBranch)
    expect(preview.entries.map((e) => e.title)).toEqual([
      'Read PDFs — developer, attempt 1',
      'Flag binaries — developer, attempt 1',
    ])
    expect(preview.note).toBe(
      'main has not moved, so the 2 commits land on it as they are — no merge commit, so the message is used only if main moves first.',
    )
  })

  it('shows a pull request as opened by the chosen account', () => {
    const form = {
      ...processIntegrationFormStart('pull-request', options()),
      accountId: 'kamil',
    }
    expect(processIntegrationFormPreview(form, options(), workBranch)).toEqual({
      where: 'As it will show on GitHub',
      entries: [
        {
          title: 'File tools: read PDFs',
          body: 'Reads PDFs.\n\n## Commits',
          byline: 'Opened by kamil from factory/file-tools-04bd5862 into main',
        },
      ],
    })
  })

  it.each([
    ['dev.azure.com', 'As it will show on Azure DevOps'],
    ['acme.visualstudio.com', 'As it will show on Azure DevOps'],
    ['gitlab.com', 'As it will show on GitLab'],
    ['bitbucket.org', 'As it will show on Bitbucket'],
    ['git.acme.internal', 'As it will show in the history'],
  ])('names where it shows for %s', (remoteHost, where) => {
    const form = processIntegrationFormStart('squash', options())
    expect(processIntegrationFormPreview(form, options({ remoteHost }), workBranch).where).toBe(
      where,
    )
  })

  it('says it shows in the history when there is no remote', () => {
    const { remoteHost: _r, ...noRemote } = options()
    const form = processIntegrationFormStart('squash', noRemote)
    expect(processIntegrationFormPreview(form, noRemote, workBranch).where).toBe(
      'As it will show in the history',
    )
  })

  it('names no one when no identity is chosen', () => {
    const form = processIntegrationFormStart('squash', options({ identities: [] }))
    expect(
      processIntegrationFormPreview(form, options({ identities: [] }), workBranch).entries[0]
        ?.byline,
    ).toBe('No one chosen to commit as')
  })

  it('lists at most a few commits, saying how many more come', () => {
    const many = options({
      fastForward: true,
      commits: Array.from({ length: 9 }, (_, i) => `Commit ${i + 1}`),
    })
    const preview = processIntegrationFormPreview(
      processIntegrationFormStart('merge', many),
      many,
      workBranch,
    )
    expect(preview.entries).toHaveLength(6)
    expect(preview.more).toBe(3)
  })
})

describe('processIntegrationIdentityLabel', () => {
  it('reads as the commits will, with the account and whether it is the project’s', () => {
    expect(processIntegrationIdentityLabel(projectBot)).toBe(
      'acme-bot <bot@acme.io> · acme-bot on github.com · project default',
    )
    expect(processIntegrationIdentityLabel(kamil)).toBe(
      'Kamil Chmurzynski <kamil@example.com> · kamil on github.com',
    )
  })
})

describe('processIntegrationAccountLabel', () => {
  it('names the account, its host and whether it is the project’s', () => {
    expect(processIntegrationAccountLabel(options().accounts[0]!)).toBe(
      'acme-bot on github.com (Acme bot) · project default',
    )
    expect(processIntegrationAccountLabel(options().accounts[1]!)).toBe(
      'kamil on github.com (Kamil on GitHub)',
    )
  })
})
