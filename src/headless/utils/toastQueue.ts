/**
 * The queue after a toast arrives: one whose id is already showing takes that
 * toast's place, as a notification with the same tag replaces its prior one;
 * any other is appended. Pure.
 */
export function placeToast<T extends { id: string }>(items: readonly T[], item: T): T[] {
  const at = items.findIndex((x) => x.id === item.id)
  if (at === -1) return [...items, item]
  return items.map((x, i) => (i === at ? item : x))
}
