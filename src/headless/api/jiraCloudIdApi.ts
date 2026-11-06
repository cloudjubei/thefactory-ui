import { client } from './generated/client.gen'

/** What an Atlassian site says its cloud id is. Written by hand until the SDK is generated from this route. */
export async function findJiraCloudId(siteUrl: string): Promise<string> {
  const { data } = await client.get({
    url: '/api/v1/provider-connections/jira-cloud-id',
    query: { siteUrl },
    throwOnError: true,
  })
  return (data as { cloudId: string }).cloudId
}
