import { forwardRef, useCallback, type ForwardedRef } from 'react'
import { rankMentionMatches } from '../../../headless/utils/mention'
import { useFiles } from '../../../headless/contexts/FilesContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { cn } from '../../utils/cn'
import FileMentionsTextarea, { type FileMentionsTextareaProps } from './FileMentionsTextarea'

export type ReferenceTextareaProps = Omit<
  FileMentionsTextareaProps,
  'onSearchFiles' | 'onSearchReferences' | 'onSearchHandles'
> & {
  invalid?: boolean
}

const MAX_SUGGESTIONS = 8

/**
 * A text box that can point at things — `@` a file, `#` a story or feature,
 * `&` a note — with the suggestions of the project in view. For text saved
 * outside a form: a rejection reason, an answer, a sign-off note. The caller
 * saves it through `useCanonicalizeReferences`, so what was typed is kept as
 * ids. Looks like the `Textarea` primitive.
 */
function ReferenceTextareaInner(
  { className, invalid = false, rows = 3, ...props }: ReferenceTextareaProps,
  ref: ForwardedRef<HTMLTextAreaElement>,
) {
  const references = useReferenceRendering()?.references
  const { paths } = useFiles()
  const onSearchFiles = useCallback(
    (token: string) => rankMentionMatches(paths, token, MAX_SUGGESTIONS),
    [paths],
  )
  return (
    <FileMentionsTextarea
      ref={ref}
      rows={rows}
      className={cn(
        'rounded-md border text-sm px-3 py-2 bg-surface-raised placeholder:text-text-muted',
        invalid ? 'border-red-400' : 'border-border',
        className,
      )}
      onSearchFiles={onSearchFiles}
      {...(references
        ? {
            onSearchReferences: (token: string) =>
              references.searchWork(token).slice(0, MAX_SUGGESTIONS),
            onSearchHandles: (token: string) =>
              references.searchHandles(token).slice(0, MAX_SUGGESTIONS),
          }
        : {})}
      {...props}
    />
  )
}

const ReferenceTextarea = forwardRef(ReferenceTextareaInner)
export default ReferenceTextarea
