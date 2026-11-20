/** What the park / tool-ask card shows for a host-check consent ask. */
export type HostCheckConsentView = {
  title: string
  hostReason: string
  commands: readonly string[]
  checkIds: readonly string[]
}
