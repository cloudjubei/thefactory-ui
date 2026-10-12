import { describe, expect, it } from 'vitest'
import type { ProcessIntegrationOptions } from 'thefactory-tools/types'

import { processIntegrationFormStart } from 'thefactory-tools/utils'
import {
  processIntegrationAccountLabel,
  processIntegrationFormPreview,
  processIntegrationIdentityLabel,
} from './processIntegrationForm'

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
      'main has not moved, so the 2 commits are added to it as they are — no merge commit, so the message is used only if main moves first.',
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
