import { useReviewEvidenceMediaUrl, type EvidenceTile } from '../../../../headless'

/** A trace is an archive to open in Playwright, never a video. */
export default function TraceDownload({
  projectId,
  tile,
}: {
  projectId: string
  tile: EvidenceTile
}) {
  const { url, loading } = useReviewEvidenceMediaUrl(projectId, tile.ref.id)
  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) p-2.5">
      <span className="text-[12px] text-(--text-primary)">{tile.caption}</span>
      {url ? (
        <a
          className="text-[12px] underline"
          href={`${url}${url.includes('?') ? '&' : '?'}download=true`}
          download
          rel="noreferrer"
        >
          Download Playwright trace
        </a>
      ) : (
        <span className="text-[12px] text-(--text-secondary)">
          {loading ? 'Loading trace…' : 'The trace could not be loaded.'}
        </span>
      )}
    </section>
  )
}
