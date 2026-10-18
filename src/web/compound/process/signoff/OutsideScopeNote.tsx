export type OutsideScopeNoteProps = {
  /** "Outside the feature’s scope: a.ts, b.ts", from the sign-off. */
  line: string
}

/**
 * The changed files a code review was told lie outside the features' scope,
 * said at the sign-off's decision. A note for the person, never a block.
 * Native peer: the same line in `native/compound/process/StorySignoffReview`.
 */
export default function OutsideScopeNote({ line }: OutsideScopeNoteProps) {
  return (
    <div role="note" className="max-w-[72ch] text-[12.5px] text-(--status-review-soft-fg)">
      {line}
    </div>
  )
}
