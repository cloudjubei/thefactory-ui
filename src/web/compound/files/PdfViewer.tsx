export type PdfViewerProps = {
  src: string
  title?: string
}

/**
 * Renders a PDF using the browser's native viewer via `<object>`. The
 * native viewer supplies zoom, pagination, search, etc. — consumer just
 * supplies a fetchable URL (typically a blob URL so auth headers can flow
 * through `fetch`).
 */
export function PdfViewer({ src, title }: PdfViewerProps) {
  return (
    <object
      type="application/pdf"
      data={src}
      aria-label={title ?? 'PDF preview'}
      className="w-full h-full"
    >
      <div className="p-4 text-sm text-(--text-secondary)">
        This browser can't render the PDF inline. <a href={src}>Open it in a new tab</a>.
      </div>
    </object>
  )
}

export default PdfViewer
