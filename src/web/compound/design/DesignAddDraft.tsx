import { useMemo, useRef, useState } from 'react'
import { DESIGN_TEXT, useFiles } from '../../../headless'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { IconExternalLink, IconFiles, IconUpload } from '../../icons'
import FileSelector from '../files/FileSelector'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { DesignDraftSource } from './designWebTypes'

export type DesignAddDraftProps = {
  onAdd: (source: DesignDraftSource) => void
  /** Smaller buttons, for a column header. */
  compact?: boolean
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** The ways to propose a design besides a drop: files from this machine, a project file, a link. */
export default function DesignAddDraft({ onAdd, compact }: DesignAddDraftProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const [linking, setLinking] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const { files } = useFiles()
  const metas = useMemo<UikitFileMeta[]>(
    () =>
      files.map((f) => ({
        name: f.name,
        relativePath: f.relativePath,
        absolutePath: f.absolutePath,
        type: f.type ?? f.ext ?? null,
        size: f.size,
        mtime: f.mtime,
      })),
    [files],
  )
  const size = compact ? 'sm' : 'md'
  const closeLink = () => {
    setLinking(false)
    setUrl('')
    setName('')
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const chosen = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (chosen.length > 0) onAdd({ type: 'files', files: chosen })
        }}
      />
      <Button size={size} variant="secondary" onClick={() => inputRef.current?.click()}>
        <IconUpload className="h-3.5 w-3.5" />
        {DESIGN_TEXT.uploadFiles}
      </Button>
      <Button size={size} variant="secondary" onClick={() => setPicking(true)}>
        <IconFiles className="h-3.5 w-3.5" />
        {DESIGN_TEXT.pickProjectFile}
      </Button>
      <Button size={size} variant="secondary" onClick={() => setLinking(true)}>
        <IconExternalLink className="h-3.5 w-3.5" />
        {DESIGN_TEXT.pasteLink}
      </Button>
      {picking ? (
        <Modal
          isOpen
          title={DESIGN_TEXT.pickProjectFile}
          onClose={() => setPicking(false)}
          size="lg"
        >
          <FileSelector
            files={metas}
            allowMultiple
            onConfirm={(paths) => {
              setPicking(false)
              if (paths.length > 0) onAdd({ type: 'paths', paths })
            }}
          />
        </Modal>
      ) : null}
      {linking ? (
        <Modal isOpen title={DESIGN_TEXT.pasteLink} onClose={closeLink} size="md">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!isHttpUrl(url.trim())) return
              onAdd({
                type: 'link',
                url: url.trim(),
                ...(name.trim() ? { name: name.trim() } : {}),
              })
              closeLink()
            }}
          >
            <Input
              autoFocus
              placeholder="https://www.figma.com/…"
              aria-label="Link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Input
              placeholder="Name (optional)"
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {url.trim() && !isHttpUrl(url.trim()) ? (
              <p className="text-[12px] text-(--status-stuck-soft-fg)">Use an http(s) link.</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeLink}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!isHttpUrl(url.trim())}>
                Add link
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}
