import { useMemo, useRef, useState } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import {
  ANSWER_FILES_COPY,
  ANSWER_FILES_MAX,
  CHAT_ATTACHMENT_MAX_BYTES,
  addAnswerFiles,
  attachmentUploadError,
  type AnswerFilesSource,
} from '../../../headless'
import { IconAttach, IconClose, IconFiles } from '../../icons'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { arrayBufferToBase64 } from '../../utils/uploadEncoding'
import type { UikitFileMeta } from '../files/FileDisplay'
import FileSelector from '../files/FileSelector'

/**
 * The files an answer hands the waiting agent: attached from this device or
 * picked from the project, each a chip that can be taken off again.
 */
export default function AnswerFiles({
  source,
  files,
  onChange,
}: {
  source: AnswerFilesSource
  files: readonly string[]
  onChange: (files: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string[]>([])
  const [error, setError] = useState<string | undefined>()
  const [projectFiles, setProjectFiles] = useState<string[] | undefined>()
  const [picking, setPicking] = useState(false)
  const full = files.length + uploading.length >= ANSWER_FILES_MAX
  const metas = useMemo<UikitFileMeta[]>(
    () =>
      (projectFiles ?? []).map((path) => ({
        name: path.split('/').pop() ?? path,
        relativePath: path,
      })),
    [projectFiles],
  )

  const upload = async (chosen: File[]) => {
    setError(undefined)
    const room = ANSWER_FILES_MAX - files.length - uploading.length
    const taken = chosen.slice(0, Math.max(0, room))
    const tooBig = taken
      .map((f) => attachmentUploadError(f, CHAT_ATTACHMENT_MAX_BYTES))
      .find(Boolean)
    if (tooBig) {
      setError(tooBig)
      return
    }
    setUploading((names) => [...names, ...taken.map((f) => f.name)])
    const uploaded: string[] = []
    for (const file of taken) {
      try {
        uploaded.push(await source.upload(file.name, arrayBufferToBase64(await file.arrayBuffer())))
      } catch {
        setError(ANSWER_FILES_COPY.uploadFailed(file.name))
      }
    }
    setUploading((names) => names.filter((n) => !taken.some((f) => f.name === n)))
    onChange(addAnswerFiles(files, uploaded))
  }

  const pickFromProject = async () => {
    setError(undefined)
    setPicking(true)
    const load = source.loadProjectFiles
    if (projectFiles === undefined && load) setProjectFiles(await load().catch(() => []))
  }

  return (
    <div className="flex flex-col gap-1.5">
      {files.length > 0 || uploading.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {files.map((path) => (
            <li
              key={path}
              className="flex items-center gap-1 rounded-md border border-(--border-default) bg-(--surface-raised) px-2 py-0.5 text-[11.5px] text-(--text-primary)"
              title={path}
            >
              <span className="max-w-[180px] truncate">{attachmentDisplayName(path)}</span>
              <button
                type="button"
                className="text-(--text-muted) hover:text-(--text-primary)"
                aria-label={ANSWER_FILES_COPY.remove(attachmentDisplayName(path))}
                onClick={() => onChange(files.filter((f) => f !== path))}
              >
                <IconClose className="h-3 w-3" />
              </button>
            </li>
          ))}
          {uploading.map((name) => (
            <li
              key={`uploading-${name}`}
              className="rounded-md border border-dashed border-(--border-default) px-2 py-0.5 text-[11.5px] text-(--text-muted)"
            >
              {ANSWER_FILES_COPY.uploading(name)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (chosen.length > 0) void upload(chosen)
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={full}
          onClick={() => inputRef.current?.click()}
        >
          <IconAttach className="h-3.5 w-3.5" />
          {ANSWER_FILES_COPY.attach}
        </Button>
        {source.loadProjectFiles ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={full}
            onClick={() => void pickFromProject()}
          >
            <IconFiles className="h-3.5 w-3.5" />
            {ANSWER_FILES_COPY.fromProject}
          </Button>
        ) : null}
        {full ? (
          <span className="text-[11px] text-(--text-muted)">{ANSWER_FILES_COPY.full}</span>
        ) : null}
      </div>
      {error ? (
        <span className="text-[11px] text-(--status-stuck-soft-fg)" role="alert">
          {error}
        </span>
      ) : null}
      {picking ? (
        <Modal
          isOpen
          title={ANSWER_FILES_COPY.pickerTitle}
          onClose={() => setPicking(false)}
          size="lg"
        >
          <FileSelector
            files={metas}
            allowMultiple
            initialSelected={files.filter((f) => projectFiles?.includes(f))}
            onConfirm={(paths) => {
              setPicking(false)
              onChange(addAnswerFiles(files, paths))
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
