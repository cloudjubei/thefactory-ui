/** Where a run's pipeline opens: the run at its top, and the runs drilled into below it. */
export interface ProcessRunEntry {
  rootId: string
  stack: string[]
}
