import type { AppSelectionComposerProps } from '../../../headless/utils/appSelections'

export default function AppSelectionChips({
  appSelections = [],
  onChangeAppSelections,
  onShowApp,
}: AppSelectionComposerProps) {
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
      {appSelections.map((selection, index) => (
        <div
          key={selection.id}
          className="rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 text-sm"
        >
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all" title={selection.outerHtml}>
              {index + 1}. {selection.selector}
            </code>
            {onChangeAppSelections ? (
              <button
                type="button"
                aria-label={`Remove app selection ${index + 1}`}
                onClick={() =>
                  onChangeAppSelections(appSelections.filter((item) => item.id !== selection.id))
                }
              >
                ×
              </button>
            ) : null}
          </div>
          <textarea
            aria-label={`Comment on app selection ${index + 1}`}
            placeholder="What should change here?"
            rows={2}
            value={selection.comment}
            readOnly={!onChangeAppSelections}
            onChange={(event) =>
              onChangeAppSelections?.(
                appSelections.map((item) =>
                  item.id === selection.id ? { ...item, comment: event.target.value } : item,
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
