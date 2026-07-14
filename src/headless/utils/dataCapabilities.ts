import {
  DATA_CAPABILITY_RECORD_KEY,
  DATA_CAPABILITY_RECORD_TYPE,
} from 'thefactory-tools/constants'
import { isDataCapabilityManifest } from 'thefactory-tools/validations'
import { putProjectDataRecord, type ProjectDataPutInput } from '../api/projectData'

type PutFn = (projectId: string, input: ProjectDataPutInput) => Promise<unknown>

/**
 * Persist an embedded app's declared data-capability manifest (the `data` block of `app.capabilities`)
 * as the per-project `data-capability` record the backend reads when advertising the generic
 * project-data chat tools (F.1). Best-effort + validated: a malformed/absent manifest is ignored and a
 * write failure is swallowed (the chat still works without the generic tools). Returns whether it wrote.
 * `put` is injected so this stays unit-testable without the network.
 */
export async function persistAppDataCapabilities(
  projectId: string,
  data: unknown,
  put: PutFn = putProjectDataRecord,
): Promise<boolean> {
  if (!isDataCapabilityManifest(data)) return false
  try {
    await put(projectId, {
      type: DATA_CAPABILITY_RECORD_TYPE,
      key: DATA_CAPABILITY_RECORD_KEY,
      content: data as unknown as Record<string, unknown>,
    })
    return true
  } catch {
    return false
  }
}
