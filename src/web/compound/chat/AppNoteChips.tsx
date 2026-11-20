import { appNoteLabel, appNoteMarkup } from '../../../headless/utils/appNotes'
import type { AppNoteComposerProps } from '../../../headless/utils/appNotesTypes'

export default function AppNoteChips({
  appNotes = [],
  onChangeAppNotes,
  onShowApp,
}: AppNoteComposerProps) {
  return (
    <div className="flex flex-col gap-2 p-2" aria-label="App selections">
      {onShowApp ? (
        <button
          type="button"
          onClick={onShowApp}
          className="self-start text-sm text-(--accent-primary)"
        >
          Show app
        </button>
      ) : null}
      {appNotes.map((note, index) => (
        <div
          key={note.id}
          className="rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 text-sm"
        >
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all" title={appNoteMarkup(note)}>
              {index + 1}. {appNoteLabel(note)}
            </code>
            {onChangeAppNotes ? (
              <button
                type="button"
                aria-label={`Remove app selection ${index + 1}`}
                onClick={() => onChangeAppNotes(appNotes.filter((item) => item.id !== note.id))}
              >
                ×
              </button>
            ) : null}
          </div>
          <textarea
            aria-label={`Comment on app selection ${index + 1}`}
            placeholder="What should change here?"
            rows={2}
            value={note.comment}
            readOnly={!onChangeAppNotes}
            onChange={(event) =>
              onChangeAppNotes?.(
                appNotes.map((item) =>
                  item.id === note.id ? { ...item, comment: event.target.value } : item,
                ),
              )
            }
            className="mt-1 w-full resize-y rounded border border-(--border-default) bg-transparent p-1 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
          />
        </div>
      ))}
    </div>
  )
}
