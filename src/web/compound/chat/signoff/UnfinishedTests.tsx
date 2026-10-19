import {
  FINISHED_FILES_WORD,
  UNFINISHED_FILE_WORD,
  type UnfinishedTestsView,
} from '../../../../headless'

/**
 * The files a test run could not finish — each with why and the last it
 * printed — and the files that did, as one passed row unless their suites
 * are listed with the run. Amber, never the red of a failure: nothing here
 * failed.
 */
export function UnfinishedTests({ view }: { view: UnfinishedTestsView }) {
  return (
    <div className="flex flex-col gap-2">
      {view.files.map((file) => (
        <div key={file.path} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-(--status-working-soft-bg) px-2.5 py-2 text-[12.5px] text-(--status-working-soft-fg)">
            <span className="font-semibold">{UNFINISHED_FILE_WORD}</span>
            <code className="min-w-0 break-all font-mono text-[12px]">{file.path}</code>
            <span className="ml-auto">{file.reason}</span>
          </div>
          {file.outputTail ? (
            <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-(--surface-muted) px-2.5 py-2 font-mono text-[11.5px] text-(--text-primary)">
              {file.outputTail}
            </pre>
          ) : null}
        </div>
      ))}
      {view.finished && !view.finished.listed ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-(--status-done-soft-bg) px-2.5 py-2 text-[12.5px] text-(--status-done-soft-fg)">
          <span className="font-semibold">{FINISHED_FILES_WORD}</span>
          <span className="min-w-0 break-all">{view.finished.label}</span>
          <span className="ml-auto">{view.finished.countLabel}</span>
        </div>
      ) : null}
    </div>
  )
}
