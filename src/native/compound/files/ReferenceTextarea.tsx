import { forwardRef, useCallback } from 'react'
import { rankMentionMatches } from '../../../headless/utils/mention'
import { useFiles } from '../../../headless/contexts/FilesContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import FileMentionsTextarea, {
  type FileMentionsTextareaHandle,
  type FileMentionsTextareaProps,
} from './FileMentionsTextarea'

export type ReferenceTextareaProps = Omit<
  FileMentionsTextareaProps,
  'onSearchFiles' | 'onSearchReferences' | 'onSearchHandles'
>

const MAX_SUGGESTIONS = 5

/**
 * Native peer of web's `ReferenceTextarea`: a text box that can point at things
 * — `@` a file, `#` a story or feature, `&` a note — with the suggestions of the
 * project in view. The caller saves it through `useCanonicalizeReferences`.
 */
const ReferenceTextarea = forwardRef<FileMentionsTextareaHandle, ReferenceTextareaProps>(
  function ReferenceTextarea(props, ref) {
    const references = useReferenceRendering()?.references
    const { paths } = useFiles()
    const onSearchFiles = useCallback(
      (token: string) => rankMentionMatches(paths, token, MAX_SUGGESTIONS),
      [paths],
    )
    return (
      <FileMentionsTextarea
        ref={ref}
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
  },
)

export default ReferenceTextarea
