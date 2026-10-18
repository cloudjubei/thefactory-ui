import { REVIEW_ON_BASE_COPY, REVIEW_ON_BASE_NAMED_FILES } from './reviewOnBaseConstants'
import type { ReviewOnBaseInput, ReviewOnBaseOfferView } from './reviewOnBaseTypes'

function namedFiles(paths: readonly string[]): string {
  const named = paths.slice(0, REVIEW_ON_BASE_NAMED_FILES)
  const rest = paths.length - named.length
  return rest > 0 ? `${named.join(', ')} ${REVIEW_ON_BASE_COPY.moreFiles(rest)}` : named.join(', ')
}

/**
 * The offer to close a review as already on its base, from how the server read
 * it: "Already on <base> — close it" when the base holds it or a later commit
 * replaced it; when the base lacks some of it, a quieter "Close as already on
 * <base>…" that asks first — naming the files it lacks, or why git could not
 * tell — and sends the person's confirm. `undefined` until read, and for a
 * review with nothing to close or no base. Pure.
 */
export function reviewOnBaseOfferView(input: ReviewOnBaseInput): ReviewOnBaseOfferView | undefined {
  const { preview } = input
  if (!preview || preview.kind === 'none') return undefined
  const base = preview.baseRef
  const busy = input.busy === true
  const common = {
    busy,
    busyLabel: REVIEW_ON_BASE_COPY.closing,
    ...(input.error ? { error: input.error } : {}),
  }
  if (preview.kind === 'neither') {
    return {
      label: REVIEW_ON_BASE_COPY.closeAnyway(base),
      detail:
        preview.paths && preview.paths.length > 0
          ? REVIEW_ON_BASE_COPY.lacks(base, namedFiles(preview.paths))
          : preview.reason,
      confirm: {
        text: REVIEW_ON_BASE_COPY.confirm,
        action: REVIEW_ON_BASE_COPY.confirmAction,
        keep: REVIEW_ON_BASE_COPY.keep,
      },
      ...common,
    }
  }
  return {
    label: REVIEW_ON_BASE_COPY.close(base),
    detail:
      preview.kind === 'held'
        ? REVIEW_ON_BASE_COPY.held(base)
        : REVIEW_ON_BASE_COPY.superseded(base),
    ...common,
  }
}
