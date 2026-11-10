/**
 * Whether the code that makes an app's fake data possible is committed with the work, or used
 * for proof only and left out when the work is merged. Absent means `'ship'`.
 */
export type FakeDataInProduct = 'ship' | 'keep-out'

/** One choice of the switch, as the launch card and the project editor show it. */
export type FakeDataInProductOption = {
  value: FakeDataInProduct
  label: string
  /** The one line under the switch while this choice is picked. */
  line: string
}
