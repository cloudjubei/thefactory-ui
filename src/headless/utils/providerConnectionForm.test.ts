import { describe, expect, it } from 'vitest'

import {
  isJiraCloudId,
  isJiraSiteUrl,
  isOAuthConnection,
  isProviderOAuthPage,
  jiraCloudIdHint,
  jiraCloudIdProblem,
  jiraCloudIdSiteOf,
  jiraTokenTypeOf,
  providerBaseUrlProblem,
  providerConnectionDraftOf,
  providerConnectionDraftProblem,
  providerConnectionDraftWithSite,
  providerConnectionFieldsOf,
  providerConnectionLabel,
  providerConnectionLine,
  providerConnectionSpec,
  providerOAuthDraftProblem,
  providerOAuthFailure,
  providerOAuthReturnOf,
  providerOAuthStartBody,
  providerOAuthStateOf,
  providerTokenFieldCopy,
} from './providerConnectionForm'
import {
  JIRA_TOKEN_COPY,
  JIRA_TOKEN_TYPES,
  PROVIDER_CONNECTION_KEEP_TOKEN_HINT,
  PROVIDER_CONNECTION_NEW_TOKEN_LABEL,
  PROVIDER_CONNECTION_OPTIONS,
  PROVIDER_CONNECTION_PROBLEMS,
  PROVIDER_OAUTH_COPY,
} from './providerConnectionFormConstants'

const draft = (over: Partial<ReturnType<typeof providerConnectionDraftOf>> = {}) => ({
  ...providerConnectionDraftOf(undefined),
  name: 'Acme',
  ...over,
})

describe('the provider choices', () => {
  it('offers Azure DevOps beside GitHub Issues and Jira', () => {
    expect(PROVIDER_CONNECTION_OPTIONS.map((option) => option.value)).toEqual([
      'github',
      'jira',
      'azure-devops',
    ])
  })

  it('reads a provider by its label, and an unknown one as it is stored', () => {
    expect(providerConnectionLabel('azure-devops')).toBe('Azure DevOps')
    expect(providerConnectionLabel('linear')).toBe('linear')
  })

  it('asks Azure DevOps for a URL and a token, and no account email', () => {
    const spec = providerConnectionSpec('azure-devops')
    expect(spec.baseUrl?.label).toBe('Organization or project URL')
    expect(spec.token.label).toBe('Personal access token')
    expect(spec.username).toBeUndefined()
    expect(spec.oauth).toBeUndefined()
  })

  it('asks a provider it does not know for a token alone', () => {
    const spec = providerConnectionSpec('linear')
    expect(spec.username).toBeUndefined()
    expect(spec.baseUrl).toBeUndefined()
    expect(spec.oauth).toBeUndefined()
  })

  it('does not read an Object prototype name as a provider', () => {
    expect(providerConnectionSpec('constructor').oauth).toBeUndefined()
    expect(providerConnectionLabel('toString')).toBe('toString')
  })

  it('offers sign-in only where the backend has it', () => {
    expect(providerConnectionSpec('github').oauth).toEqual({
      action: 'Connect with GitHub',
      cloudId: false,
    })
    expect(providerConnectionSpec('jira').oauth).toEqual({
      action: 'Connect with Jira',
      cloudId: true,
    })
  })
})

describe('PROVIDER_CONNECTION_NEW_TOKEN_LABEL', () => {
  it('keeps an acronym and lowers a word', () => {
    expect(PROVIDER_CONNECTION_NEW_TOKEN_LABEL('API token')).toBe('New API token (optional)')
    expect(PROVIDER_CONNECTION_NEW_TOKEN_LABEL('Personal access token')).toBe(
      'New personal access token (optional)',
    )
  })
})

describe('providerBaseUrlProblem', () => {
  it.each([
    'https://dev.azure.com/acme',
    'https://dev.azure.com/acme/Platform',
    'https://dev.azure.com/acme/Platform/',
    'https://acme.visualstudio.com',
    'https://acme.visualstudio.com/Platform',
    'https://acme.visualstudio.com/DefaultCollection/Platform',
    '  https://dev.azure.com/acme  ',
  ])('takes %s', (baseUrl) => {
    expect(providerBaseUrlProblem(draft({ provider: 'azure-devops', baseUrl }))).toBeUndefined()
  })

  it.each([
    'http://dev.azure.com/acme',
    'https://dev.azure.com',
    'https://dev.azure.com/a/b/c',
    'https://dev.azure.com:8080/acme',
    'https://me@dev.azure.com/acme',
    'https://dev.azure.com/acme?x=1',
    'https://dev.azure.com/acme#top',
    'https://evil.example/dev.azure.com/acme',
    'https://a.b.visualstudio.com',
    'https://acme.visualstudio.com/one/two',
    'dev.azure.com/acme',
  ])('refuses %s, which the connector would refuse too', (baseUrl) => {
    expect(providerBaseUrlProblem(draft({ provider: 'azure-devops', baseUrl }))).toBe(
      PROVIDER_CONNECTION_PROBLEMS.azureUrl,
    )
  })

  it('says nothing until a URL is typed', () => {
    expect(providerBaseUrlProblem(draft({ provider: 'azure-devops' }))).toBeUndefined()
  })

  it('leaves the URL of any other provider alone', () => {
    expect(
      providerBaseUrlProblem(
        draft({ provider: 'jira', tokenType: 'classic', baseUrl: 'jira.acme.internal' }),
      ),
    ).toBeUndefined()
  })
})

describe('providerConnectionDraftProblem', () => {
  const add = { creating: true }

  it('needs a name', () => {
    expect(providerConnectionDraftProblem(draft({ name: ' ', token: 't' }), add)).toBe(
      PROVIDER_CONNECTION_PROBLEMS.name,
    )
  })

  it('needs a token to add a connection, and none to edit one', () => {
    expect(providerConnectionDraftProblem(draft(), add)).toBe(PROVIDER_CONNECTION_PROBLEMS.token)
    expect(providerConnectionDraftProblem(draft(), { creating: false })).toBeUndefined()
  })

  it('needs what Jira authenticates with', () => {
    const jira = draft({ provider: 'jira', tokenType: 'classic', token: 't' })
    expect(providerConnectionDraftProblem(jira, add)).toBe(PROVIDER_CONNECTION_PROBLEMS.username)
    expect(providerConnectionDraftProblem({ ...jira, username: 'a@b.c' }, add)).toBe(
      PROVIDER_CONNECTION_PROBLEMS.baseUrl,
    )
    expect(
      providerConnectionDraftProblem(
        { ...jira, username: 'a@b.c', baseUrl: 'https://acme.atlassian.net' },
        add,
      ),
    ).toBeUndefined()
  })

  it('needs an Azure DevOps URL, and a good one', () => {
    const azure = draft({ provider: 'azure-devops', token: 't' })
    expect(providerConnectionDraftProblem(azure, add)).toBe(PROVIDER_CONNECTION_PROBLEMS.baseUrl)
    expect(
      providerConnectionDraftProblem({ ...azure, baseUrl: 'https://example.com/acme' }, add),
    ).toBe(PROVIDER_CONNECTION_PROBLEMS.azureUrl)
    expect(
      providerConnectionDraftProblem({ ...azure, baseUrl: 'https://dev.azure.com/acme' }, add),
    ).toBeUndefined()
  })
})

describe('providerConnectionFieldsOf', () => {
  it('sends only what the chosen provider uses, whatever was typed for another', () => {
    expect(
      providerConnectionFieldsOf(
        draft({
          provider: 'github',
          username: 'left@over.com',
          baseUrl: 'https://left.over',
          token: ' t ',
        }),
      ),
    ).toEqual({ name: 'Acme', provider: 'github', token: 't' })
  })

  it('sends an Azure DevOps URL and token, and no username', () => {
    expect(
      providerConnectionFieldsOf(
        draft({
          provider: 'azure-devops',
          username: 'left@over.com',
          baseUrl: ' https://dev.azure.com/acme ',
          token: 't',
        }),
      ),
    ).toEqual({
      name: 'Acme',
      provider: 'azure-devops',
      baseUrl: 'https://dev.azure.com/acme',
      token: 't',
    })
  })

  it('leaves a blank token out, so an edit keeps the stored one', () => {
    expect(providerConnectionFieldsOf(draft({ provider: 'github', token: '  ' }))).toEqual({
      name: 'Acme',
      provider: 'github',
    })
  })

  it('never takes a stored token into a draft', () => {
    const stored = { name: 'Acme', provider: 'jira', token: 'kept-secret', hasToken: true }
    expect(JSON.stringify(providerConnectionDraftOf(stored))).not.toContain('kept-secret')
  })
})

describe('a Jira token’s type', () => {
  const CLOUD = '11111111-2222-4333-8444-555555555555'
  const OTHER = '99999999-2222-4333-8444-555555555555'
  const SITE = 'https://acme.atlassian.net'
  const add = { creating: true }
  const jira = draft({
    provider: 'jira',
    username: 'a@b.c',
    baseUrl: SITE,
    token: 't',
    cloudId: CLOUD,
  })
  const classicStored = { name: 'Acme', provider: 'jira', username: 'a@b.c', baseUrl: SITE }
  const scopedStored = {
    ...classicStored,
    config: { jiraApiTokenMode: 'scoped', cloudId: CLOUD },
  }
  const edit = (stored: typeof classicStored) => ({ creating: false, stored })
  const editDraft = (stored: typeof classicStored, over = {}) => ({
    ...providerConnectionDraftOf(stored),
    ...over,
  })

  it('offers With scopes first, and Classic', () => {
    expect(JIRA_TOKEN_TYPES).toEqual([
      { value: 'scoped', label: 'With scopes' },
      { value: 'classic', label: 'Classic' },
    ])
  })

  it('opens a new connection on With scopes, the one that can write', () => {
    expect(providerConnectionDraftOf(undefined).tokenType).toBe('scoped')
  })

  it.each([
    ['no config', {}, 'classic'],
    ['an empty config', { config: {} }, 'classic'],
    ['classic named', { config: { jiraApiTokenMode: 'classic' } }, 'classic'],
    ['scoped', { config: { jiraApiTokenMode: 'scoped' } }, 'scoped'],
  ])('reads the stored type from %s', (_name, connection, type) => {
    expect(jiraTokenTypeOf(connection)).toBe(type)
  })

  it('opens an existing connection on what it holds', () => {
    expect(providerConnectionDraftOf(classicStored)).toMatchObject({
      tokenType: 'classic',
      cloudId: '',
    })
    expect(providerConnectionDraftOf(scopedStored)).toMatchObject({
      tokenType: 'scoped',
      cloudId: CLOUD,
    })
  })

  it('takes no cloud id of a sign-in into a token draft', () => {
    const oauth = { ...classicStored, tokenSource: 'oauth', config: { cloudId: 'tenant' } }
    expect(providerConnectionDraftOf(oauth).cloudId).toBe('')
  })

  it.each([
    [CLOUD, true],
    [CLOUD.toUpperCase(), true],
    [` ${CLOUD} `, true],
    ['', false],
    ['acme', false],
    ['00000000-0000-0000-0000-000000000000', false],
    [`${CLOUD}/rest`, false],
  ])('tells a cloud id: %s', (id, good) => {
    expect(isJiraCloudId(id)).toBe(good)
  })

  it.each([
    [SITE, true],
    [`${SITE}/`, true],
    [` ${SITE} `, true],
    ['https://ACME.atlassian.net', true],
    ['http://acme.atlassian.net', false],
    ['https://jira.acme.com', false],
    ['https://acme.atlassian.net.evil.com', false],
    ['https://acme.atlassian.net/jira', false],
    ['https://a.b.atlassian.net', false],
    ['', false],
  ])('tells an Atlassian site: %s', (url, good) => {
    expect(isJiraSiteUrl(url)).toBe(good)
  })

  it('takes a good scoped draft', () => {
    expect(providerConnectionDraftProblem(jira, add)).toBeUndefined()
  })

  it.each([
    ['blank', ''],
    ['a site name', 'acme'],
  ])('holds a scoped draft back on a cloud id that is %s', (_name, cloudId) => {
    expect(providerConnectionDraftProblem({ ...jira, cloudId }, add)).toBe(
      PROVIDER_CONNECTION_PROBLEMS.jiraCloudId,
    )
  })

  it('says at the URL when a site can take no scoped token', () => {
    const elsewhere = { ...jira, baseUrl: 'https://jira.acme.com' }
    expect(providerBaseUrlProblem(elsewhere)).toBe(PROVIDER_CONNECTION_PROBLEMS.jiraSite)
    expect(providerConnectionDraftProblem(elsewhere, add)).toBe(
      PROVIDER_CONNECTION_PROBLEMS.jiraSite,
    )
    expect(providerBaseUrlProblem({ ...elsewhere, tokenType: 'classic' })).toBeUndefined()
  })

  it('asks a classic token for no cloud id', () => {
    expect(
      providerConnectionDraftProblem({ ...jira, tokenType: 'classic', cloudId: '' }, add),
    ).toBeUndefined()
  })

  it('leaves another provider out of it', () => {
    const github = draft({ provider: 'github', token: 't', tokenType: 'scoped', cloudId: '' })
    expect(providerConnectionDraftProblem(github, add)).toBeUndefined()
  })

  it.each([
    ['classic to scoped', classicStored, { tokenType: 'scoped', cloudId: CLOUD }],
    ['scoped to classic', scopedStored, { tokenType: 'classic' }],
  ])('needs a new token to go from %s', (_name, stored, over) => {
    const changed = editDraft(stored, over)
    expect(providerConnectionDraftProblem(changed, edit(stored))).toBe(
      PROVIDER_CONNECTION_PROBLEMS.newToken,
    )
    expect(
      providerConnectionDraftProblem({ ...changed, token: 'new' }, edit(stored)),
    ).toBeUndefined()
  })

  it('needs no new token while the type stays', () => {
    expect(
      providerConnectionDraftProblem(editDraft(classicStored), edit(classicStored)),
    ).toBeUndefined()
    expect(
      providerConnectionDraftProblem(editDraft(scopedStored), edit(scopedStored)),
    ).toBeUndefined()
  })

  it('sends the type and the id on add, the id in one case', () => {
    expect(
      providerConnectionFieldsOf({ ...jira, cloudId: ` ${CLOUD.toUpperCase()} ` }),
    ).toMatchObject({ config: { jiraApiTokenMode: 'scoped', cloudId: CLOUD } })
  })

  it('sends no config for a classic add, or for another provider', () => {
    expect(providerConnectionFieldsOf({ ...jira, tokenType: 'classic' })).not.toHaveProperty(
      'config',
    )
    expect(
      providerConnectionFieldsOf(draft({ provider: 'github', cloudId: CLOUD })),
    ).not.toHaveProperty('config')
  })

  it('sends the switch on edit, with the new token', () => {
    const changed = editDraft(classicStored, { tokenType: 'scoped', cloudId: CLOUD, token: 'new' })
    expect(providerConnectionFieldsOf(changed, classicStored)).toMatchObject({
      token: 'new',
      config: { jiraApiTokenMode: 'scoped', cloudId: CLOUD },
    })
  })

  it('empties the config going back to classic, so no old id routes it', () => {
    const changed = editDraft(scopedStored, { tokenType: 'classic', token: 'new' })
    expect(providerConnectionFieldsOf(changed, scopedStored).config).toEqual({})
  })

  it('sends a new cloud id alone when only that changed', () => {
    const changed = editDraft(scopedStored, { cloudId: OTHER })
    expect(providerConnectionFieldsOf(changed, scopedStored).config).toEqual({
      jiraApiTokenMode: 'scoped',
      cloudId: OTHER,
    })
  })

  it('sends no config when nothing about the token changed', () => {
    expect(providerConnectionFieldsOf(editDraft(scopedStored), scopedStored)).not.toHaveProperty(
      'config',
    )
    expect(providerConnectionFieldsOf(editDraft(classicStored), classicStored)).not.toHaveProperty(
      'config',
    )
  })

  it('says at the field when a cloud id is typed wrong, and not while it is blank', () => {
    expect(jiraCloudIdProblem({ ...jira, cloudId: 'acme' })).toBe(
      PROVIDER_CONNECTION_PROBLEMS.jiraCloudId,
    )
    expect(jiraCloudIdProblem({ ...jira, cloudId: '' })).toBeUndefined()
    expect(jiraCloudIdProblem(jira)).toBeUndefined()
  })

  it('forgets the cloud id of the site it was found on', () => {
    const moved = providerConnectionDraftWithSite(jira, 'https://other.atlassian.net')
    expect(moved).toMatchObject({ baseUrl: 'https://other.atlassian.net', cloudId: '' })
  })

  it('keeps a sign-in’s cloud id when the site changes on a classic draft', () => {
    const typed = { ...jira, tokenType: 'classic' as const }
    expect(providerConnectionDraftWithSite(typed, 'https://x').cloudId).toBe(CLOUD)
  })

  it('looks a cloud id up only when one is wanted and the site can answer', () => {
    expect(jiraCloudIdSiteOf({ ...jira, cloudId: '  ', baseUrl: ` ${SITE} ` })).toBe(SITE)
    expect(jiraCloudIdSiteOf(jira)).toBeUndefined()
    expect(jiraCloudIdSiteOf({ ...jira, cloudId: '', tokenType: 'classic' })).toBeUndefined()
    expect(jiraCloudIdSiteOf({ ...jira, cloudId: '', baseUrl: 'https://x.com' })).toBeUndefined()
    expect(jiraCloudIdSiteOf({ ...jira, cloudId: '', provider: 'github' })).toBeUndefined()
  })

  it.each([
    ['idle', '', JIRA_TOKEN_COPY.cloudIdHint],
    ['finding', '', JIRA_TOKEN_COPY.cloudIdFinding],
    ['found', CLOUD, JIRA_TOKEN_COPY.cloudIdFound],
    ['failed', '', JIRA_TOKEN_COPY.cloudIdNotFound],
    ['failed', CLOUD, undefined],
    ['found', '', JIRA_TOKEN_COPY.cloudIdHint],
  ] as const)('says %s with %j in the field', (status, cloudId, hint) => {
    expect(jiraCloudIdHint(status, cloudId)).toBe(hint)
  })

  it('names the scopes a token with scopes needs, and what a classic one cannot do', () => {
    const scoped = providerTokenFieldCopy(jira, add)
    expect(scoped.hint).toBe(JIRA_TOKEN_COPY.scopedHint)
    for (const scope of ['read:jira-work', 'write:jira-work', 'read:jira-user']) {
      expect(scoped.hint).toContain(scope)
    }
    expect(providerTokenFieldCopy({ ...jira, tokenType: 'classic' }, add).hint).toBe(
      JIRA_TOKEN_COPY.classicHint,
    )
  })

  it('keeps the provider’s own words elsewhere', () => {
    expect(providerTokenFieldCopy(draft({ provider: 'github' }), add)).toEqual({
      label: 'API token',
      hint: providerConnectionSpec('github').token.hint,
    })
  })

  it('offers an optional token on edit, and asks for one across a change of type', () => {
    expect(providerTokenFieldCopy(editDraft(scopedStored), edit(scopedStored))).toEqual({
      label: 'New API token (optional)',
      hint: PROVIDER_CONNECTION_KEEP_TOKEN_HINT,
    })
    expect(
      providerTokenFieldCopy(editDraft(scopedStored, { tokenType: 'classic' }), edit(scopedStored)),
    ).toEqual({ label: 'New API token', hint: JIRA_TOKEN_COPY.newTokenHint })
  })

  it('never takes a token into a draft, whatever the type', () => {
    const stored = { ...scopedStored, token: 'kept-secret', hasToken: true }
    expect(JSON.stringify(providerConnectionDraftOf(stored))).not.toContain('kept-secret')
  })
})

describe('isOAuthConnection', () => {
  it('reads only a connection marked oauth as signed in', () => {
    expect(isOAuthConnection({ tokenSource: 'oauth' })).toBe(true)
    expect(isOAuthConnection({ tokenSource: 'api-key' })).toBe(false)
    expect(isOAuthConnection({})).toBe(false)
  })
})

describe('providerConnectionLine', () => {
  it('names the provider, the account and the site', () => {
    expect(
      providerConnectionLine({
        provider: 'jira',
        username: 'a@b.c',
        baseUrl: 'https://acme.atlassian.net',
      }),
    ).toBe('Jira · a@b.c · https://acme.atlassian.net')
  })

  it('says a connection was signed in', () => {
    expect(providerConnectionLine({ provider: 'github', tokenSource: 'oauth' })).toBe(
      'GitHub Issues · Signed in',
    )
  })
})

describe('providerOAuthDraftProblem', () => {
  it('needs a name, as a connection is kept under it', () => {
    expect(providerOAuthDraftProblem(draft({ name: ' ', provider: 'github' }))).toBe(
      PROVIDER_CONNECTION_PROBLEMS.name,
    )
    expect(providerOAuthDraftProblem(draft({ provider: 'github' }))).toBeUndefined()
  })

  it('needs a Jira cloud id in the form the backend takes', () => {
    const jira = draft({ provider: 'jira' })
    expect(providerOAuthDraftProblem(jira)).toBe(PROVIDER_CONNECTION_PROBLEMS.cloudId)
    expect(providerOAuthDraftProblem({ ...jira, cloudId: 'not a/cloud id' })).toBe(
      PROVIDER_CONNECTION_PROBLEMS.cloudId,
    )
    expect(
      providerOAuthDraftProblem({ ...jira, cloudId: '1324a887-45db-1bf4-1e99-ef0ff456d421' }),
    ).toBeUndefined()
  })

  it('refuses a provider with no sign-in', () => {
    expect(providerOAuthDraftProblem(draft({ provider: 'azure-devops' }))).toBe(
      PROVIDER_CONNECTION_PROBLEMS.noOAuth,
    )
  })
})

describe('providerOAuthStartBody', () => {
  it('sends a cloud id only for Jira', () => {
    expect(
      providerOAuthStartBody(draft({ name: ' Acme ', provider: 'github', cloudId: 'left-over' })),
    ).toEqual({ name: 'Acme' })
    expect(providerOAuthStartBody(draft({ provider: 'jira', cloudId: ' abc-1 ' }))).toEqual({
      name: 'Acme',
      cloudId: 'abc-1',
    })
  })
})

describe('isProviderOAuthPage', () => {
  it('opens only an https page', () => {
    expect(isProviderOAuthPage('https://auth.atlassian.com/authorize?state=s')).toBe(true)
    expect(isProviderOAuthPage('HTTPS://github.com/login')).toBe(true)
    expect(isProviderOAuthPage('http://auth.atlassian.com/authorize')).toBe(false)
    expect(isProviderOAuthPage('javascript:alert(1)')).toBe(false)
    expect(isProviderOAuthPage('file:///etc/passwd')).toBe(false)
  })
})

describe('providerOAuthStateOf', () => {
  it('reads the state a sign-in page was started with', () => {
    expect(providerOAuthStateOf('https://a.b/authorize?client_id=x&state=abc_-1&scope=y')).toBe(
      'abc_-1',
    )
  })

  it('has none to read on a page without one', () => {
    expect(providerOAuthStateOf('https://a.b/authorize')).toBeUndefined()
  })
})

describe('providerOAuthReturnOf', () => {
  it('reads the code and state of the page the browser ended on', () => {
    expect(
      providerOAuthReturnOf('https://app.example/callback?code=c%2F1&state=s1&extra=1'),
    ).toEqual({ kind: 'code', code: 'c/1', state: 's1' })
  })

  it('reads them after a fragment-free path, a plus sign and spaces round the paste', () => {
    expect(providerOAuthReturnOf('  http://localhost:5173/cb?state=s+1&code=c1  ')).toEqual({
      kind: 'code',
      code: 'c1',
      state: 's 1',
    })
  })

  it('stops at a fragment', () => {
    expect(providerOAuthReturnOf('https://a.b/cb?code=c&state=s#code=other')).toEqual({
      kind: 'code',
      code: 'c',
      state: 's',
    })
  })

  it('reads a refusal from the provider', () => {
    expect(
      providerOAuthReturnOf(
        'https://a.b/cb?error=access_denied&error_description=The+user+said+no&state=s',
      ),
    ).toEqual({ kind: 'refused', reason: 'The user said no' })
    expect(providerOAuthReturnOf('https://a.b/cb?error=access_denied')).toEqual({
      kind: 'refused',
      reason: 'access_denied',
    })
  })

  it.each([
    '',
    'https://a.b/cb',
    'https://a.b/cb?code=c',
    'https://a.b/cb?state=s',
    'not an address',
  ])('cannot read %j', (text) => {
    expect(providerOAuthReturnOf(text)).toEqual({ kind: 'unreadable' })
  })

  it('cannot read an address whose encoding is broken', () => {
    expect(providerOAuthReturnOf('https://a.b/cb?code=%E0%A4%A&state=s')).toEqual({
      kind: 'unreadable',
    })
  })
})

describe('providerOAuthFailure', () => {
  it('says plainly when sign-in is not set up on the backend', () => {
    expect(providerOAuthFailure('Provider OAuth is not configured')).toBe(
      PROVIDER_OAUTH_COPY.notSetUp,
    )
  })

  it('says a sign-in has run out', () => {
    expect(providerOAuthFailure('Invalid or expired OAuth state')).toBe(PROVIDER_OAUTH_COPY.expired)
  })

  it('passes on anything else as the backend said it', () => {
    expect(providerOAuthFailure('Jira cloud id is required')).toBe('Jira cloud id is required')
  })
})
