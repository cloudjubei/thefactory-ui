import {
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  PROCESS_FAKE_DATA_IN_PRODUCT_KEY,
} from './fakeDataInProductConstants'
import type { FakeDataInProduct } from './fakeDataInProductTypes'

/** Whether a value is one of the two choices. Pure. */
export function isFakeDataInProduct(value: unknown): value is FakeDataInProduct {
  return value === 'ship' || value === 'keep-out'
}

/** A project's choice as its metadata holds it: free JSON, so anything but keep-out ships. Pure. */
export function readProcessFakeDataInProduct(stored: unknown): FakeDataInProduct {
  return stored === 'keep-out' ? 'keep-out' : 'ship'
}

/** A project's metadata with its choice as edited, every other key as it was. Pure. */
export function withProcessFakeDataInProduct<T extends Record<string, unknown>>(
  metadata: T,
  value: FakeDataInProduct,
): T {
  return { ...metadata, [PROCESS_FAKE_DATA_IN_PRODUCT_KEY]: value }
}

/**
 * The choice a launch preview offers: the project's, present only when the launch's work is
 * proved on the app's screens. Nothing when the preview carries none. Pure.
 */
export function launchFakeDataOffered(preview: unknown): FakeDataInProduct | undefined {
  if (typeof preview !== 'object' || preview === null) return undefined
  const offered = (preview as { fakeDataInProduct?: unknown }).fakeDataInProduct
  return isFakeDataInProduct(offered) ? offered : undefined
}

/** The card's choice: the person's pick, else the preview's. None while the preview offers none. Pure. */
export function launchFakeDataChoice(
  offered: FakeDataInProduct | undefined,
  picked: FakeDataInProduct | undefined,
): FakeDataInProduct | undefined {
  return offered === undefined ? undefined : (picked ?? offered)
}

/** What a launch carries of the choice confirmed on its card. Pure. */
export function launchFakeDataMetadata(
  choice: FakeDataInProduct | undefined,
): { fakeDataInProduct: FakeDataInProduct } | undefined {
  return choice === undefined ? undefined : { fakeDataInProduct: choice }
}

/** The one line under the switch: what the picked choice does. Pure. */
export function fakeDataInProductLine(value: FakeDataInProduct): string {
  return FAKE_DATA_IN_PRODUCT_OPTIONS.find((option) => option.value === value)?.line ?? ''
}

/**
 * A group launch card's choices, by project id: each leg that offers one, at the person's pick,
 * else the leg's own value. Legs that offer none are left out, and so are picks for them. Pure.
 */
export function groupLaunchFakeDataChoices(
  legs: readonly { projectId: string; fakeDataInProduct?: FakeDataInProduct }[],
  picks: Readonly<Record<string, FakeDataInProduct>>,
): Record<string, FakeDataInProduct> {
  return Object.fromEntries(
    legs.flatMap((leg) => {
      const choice = launchFakeDataChoice(launchFakeDataOffered(leg), picks[leg.projectId])
      return choice === undefined ? [] : [[leg.projectId, choice] as const]
    }),
  )
}

/** What a group launch carries of the choices confirmed on its card; nothing while no leg offers one. Pure. */
export function groupLaunchFakeDataMetadata(
  legs: readonly { projectId: string; fakeDataInProduct?: FakeDataInProduct }[],
  picks: Readonly<Record<string, FakeDataInProduct>>,
): { fakeDataInProduct: Record<string, FakeDataInProduct> } | undefined {
  const choices = groupLaunchFakeDataChoices(legs, picks)
  return Object.keys(choices).length > 0 ? { fakeDataInProduct: choices } : undefined
}
