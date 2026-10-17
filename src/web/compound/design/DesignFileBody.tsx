import { useEffect, useState, type ReactNode } from 'react'
import {
  DESIGN_TEXT,
  designSourceFileName,
  designSourceMediaType,
  designViewKind,
  formatBytes,
  type DesignShown,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import { IconDownload, IconExternalLink } from '../../icons'
import { ImageViewer } from '../files/ImageViewer'
import { FileTypeIcon } from '../files/FileTypeIcon'
import { useObjectUrl } from './useObjectUrl'

export type DesignFileBodyProps = {
  shown: DesignShown
  /** The file with a view token; `undefined` while the token is minted. */
  src: string | undefined
}

function openExternally(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function TextBody({ src }: { src: string }) {
  const [state, setState] = useState<{ text?: string; error?: string }>({})
  useEffect(() => {
    let alive = true
    setState({})
    fetch(src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Could not read the file (${r.status}).`)
        return r.text()
      })
      .then((text) => alive && setState({ text }))
      .catch(
        (err: unknown) =>
          alive && setState({ error: err instanceof Error ? err.message : String(err) }),
      )
    return () => {
      alive = false
    }
  }, [src])
  if (state.error)
    return <div className="p-4 text-sm text-(--status-stuck-soft-fg)">{state.error}</div>
  if (state.text === undefined)
    return (
      <Centered>
        <Spinner size={20} />
      </Centered>
    )
  return (
    <pre className="h-full w-full overflow-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] text-(--text-primary)">
      {state.text}
    </pre>
  )
}

function ImageBody({ src, alt }: { src: string; alt: string }) {
  const { url, error } = useObjectUrl(src)
  if (error) return <div className="p-4 text-sm text-(--status-stuck-soft-fg)">{error}</div>
  if (!url)
    return (
      <Centered>
        <Spinner size={20} />
      </Centered>
    )
  return <ImageViewer src={url} alt={alt} />
}

function Framed({ src, title, sandbox }: { src: string; title: string; sandbox?: string }) {
  return (
    <iframe
      src={src}
      title={title}
      {...(sandbox ? { sandbox } : {})}
      className="h-full w-full border-0 bg-white"
    />
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center p-6">{children}</div>
}

/**
 * One design file as it is stored or was captured: an image to fit and zoom, a
 * page in a sandboxed frame (a draft case at its own address), a PDF, a video,
 * text, a link to open, or a file to download. What the viewer and the compare
 * show for each side.
 */
export default function DesignFileBody({ shown, src }: DesignFileBodyProps) {
  const { source } = shown
  const kind = designViewKind(source)
  if (source.type === 'link') {
    const url = source.url
    return (
      <Centered>
        <div className="flex max-w-xl flex-col items-center gap-3 text-center">
          <IconExternalLink className="h-8 w-8 text-(--text-muted)" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-sm text-(--accent-primary) underline"
          >
            {url}
          </a>
          <Button variant="primary" onClick={() => openExternally(url)}>
            {DESIGN_TEXT.openExternally}
          </Button>
        </div>
      </Centered>
    )
  }
  if (!src)
    return (
      <Centered>
        <Spinner size={20} />
      </Centered>
    )
  switch (kind) {
    case 'image':
      return <ImageBody src={src} alt={shown.name} />
    case 'html':
      return <Framed src={src} title={shown.name} sandbox="allow-scripts" />
    case 'pdf':
    case 'video':
      return <Framed src={src} title={shown.name} />
    case 'text':
      return <TextBody src={src} />
    default: {
      const fileName = designSourceFileName(source)
      const size = source.type === 'blob' ? formatBytes(source.bytes) : null
      return (
        <Centered>
          <div className="flex flex-col items-center gap-3 text-center">
            <FileTypeIcon name={fileName} size={48} />
            <div className="text-sm font-medium text-(--text-primary)">{fileName}</div>
            <div className="text-[12px] text-(--text-secondary)">
              {[designSourceMediaType(source), size].filter(Boolean).join(' · ')}
            </div>
            <div className="text-[12px] text-(--text-muted)">{DESIGN_TEXT.notPreviewable}</div>
            <div className="flex gap-2">
              <Button variant="secondary" asChild>
                <a href={src} download={fileName}>
                  <IconDownload className="h-4 w-4" />
                  {DESIGN_TEXT.download}
                </a>
              </Button>
              <Button variant="secondary" onClick={() => openExternally(src)}>
                <IconExternalLink className="h-4 w-4" />
                {DESIGN_TEXT.openExternally}
              </Button>
            </div>
          </div>
        </Centered>
      )
    }
  }
}
