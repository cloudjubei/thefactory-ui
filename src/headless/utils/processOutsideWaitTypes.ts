/** A run's stop while it waits on someone outside it, as its card shows it. */
export type ProcessOutsideWaitView =
  | { kind: 'waiting'; title: string; detail: string }
  | {
      kind: 'arrived'
      title: string
      /** What came, cut to a few lines for the card. */
      preview: string
      /** What came, whole. */
      detail: string
      /** Whether `preview` leaves some of `detail` out. */
      cut: boolean
      carryOnLabel: string
    }
