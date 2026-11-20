import { client } from './generated/client.gen'

const url = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/check-host-consent`

/** Whether a project's checks may fall back to the host. Written by hand until the SDK is generated from this route. */
export async function readProjectCheckHostConsent(projectId: string): Promise<boolean> {
  const { data } = await client.get({ url: url(projectId), throwOnError: true })
  return (data as { allowed: boolean }).allowed
}

/** Revoke stored host-check consent so the next fallback asks again. Written by hand until the SDK is generated. */
export async function revokeProjectCheckHostConsent(projectId: string): Promise<boolean> {
  const { data } = await client.delete({ url: url(projectId), throwOnError: true })
  return (data as { allowed: boolean }).allowed
}
