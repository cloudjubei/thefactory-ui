import { client } from './generated/client.gen'

const url = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/device-automation`

/** Whether a project's agents may drive a device. Written by hand until the SDK is generated from this route. */
export async function readProjectDeviceAutomation(projectId: string): Promise<boolean> {
  const { data } = await client.get({ url: url(projectId), throwOnError: true })
  return (data as { enabled: boolean }).enabled
}

/** Turn a project's device automation on or off. Written by hand until the SDK is generated from this route. */
export async function writeProjectDeviceAutomation(
  projectId: string,
  enabled: boolean,
): Promise<boolean> {
  const { data } = await client.put({
    url: url(projectId),
    body: { enabled },
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  return (data as { enabled: boolean }).enabled
}
