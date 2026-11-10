import { useEffect, useState } from 'react'
import type { FilePreviewState, FilePreviewTarget } from 'thefactory-ui/headless'
import type { ReferenceDescription } from 'thefactory-tools/types'

/** Every state the file preview shows, by the id its scene and native view use. */
export const FILE_PREVIEW_FILES = [
  'markdown',
  'html',
  'text',
  'image',
  'pdf',
  'unknown',
  'loading',
  'error',
  'gone',
] as const

export type FilePreviewFile = (typeof FILE_PREVIEW_FILES)[number]

export const FILE_PREVIEW_FILE_LABELS: Record<FilePreviewFile, string> = {
  markdown: 'Markdown',
  html: 'HTML',
  text: 'Text',
  image: 'Image',
  pdf: 'PDF',
  unknown: 'Unknown kind',
  loading: 'Loading',
  error: 'Error',
  gone: 'File gone',
}

const PROJECT = { projectId: 'compass-be', projectName: 'Compass BE' }
const MODIFIED = Date.UTC(2026, 10, 9, 14, 32)
const CREATED = Date.UTC(2026, 9, 21, 9, 5)

const target = (path: string): FilePreviewTarget => ({ ...PROJECT, path })

export const PROPOSAL_PATH = 'docs/ZNR-780_PRICING_ENGINE_PROPOSAL.md'

/** The file chip a group chat shows for a proposal in another project. */
export const PROPOSAL_CHIP: ReferenceDescription = {
  kind: 'file',
  label: `Compass BE ${PROPOSAL_PATH}`,
  projectName: 'Compass BE',
  link: { kind: 'file', projectId: PROJECT.projectId, path: PROPOSAL_PATH },
}

/** A folder chip: it opens in Files, and offers no preview. */
export const DOCS_FOLDER_CHIP: ReferenceDescription = {
  kind: 'file',
  label: 'Compass BE docs/',
  projectName: 'Compass BE',
  link: { kind: 'file', projectId: PROJECT.projectId, path: 'docs/' },
}

export const PROPOSAL_TEXT = `# ZNR-780 · Pricing engine proposal

The pricing engine moves out of the order service into its own module, so the
rules a merchant sets are read in one place.

## What changes

- Prices are worked out by \`PricingEngine.quote(order)\`, never inline.
- Discounts stack in a fixed order: **catalogue**, then **basket**, then **voucher**.
- A quote is kept for 15 minutes; checkout reuses it.

## Rollout

| Step | Owner | When |
| --- | --- | --- |
| Engine behind a flag | Backend | Week 1 |
| Shadow quotes | Backend | Week 2 |
| Switch over | Backend + QA | Week 3 |

\`\`\`ts
const quote = await PricingEngine.quote(order)
\`\`\`
`

export const PRICING_PAGE_PATH = 'docs/pricing-overview.html'

export const PRICING_PAGE_TEXT = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 24px; color: #1d2b4f; }
      h1 { font-size: 22px; }
      .tier { border: 1px solid #c9d4ea; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
      .price { font-weight: 700; color: #2f9b5b; }
    </style>
  </head>
  <body>
    <h1>Pricing overview</h1>
    <p>How a quote is worked out, tier by tier.</p>
    <div class="tier">Catalogue discount <span class="price">−10%</span></div>
    <div class="tier">Basket discount <span class="price">−5%</span></div>
    <div class="tier">Voucher <span class="price">−€3.00</span></div>
    <p><a href="https://example.com/pricing">A link goes nowhere from here.</a></p>
    <script>document.body.innerHTML = 'Scripts do not run in the preview.'</script>
  </body>
</html>
`

/** A file of the project on screen, as a message's own file chip resolves it. */
export const OWN_FILE = {
  projectId: PROJECT.projectId,
  meta: {
    name: 'ZNR-780_PRICING_ENGINE_PROPOSAL.md',
    relativePath: PROPOSAL_PATH,
    type: 'md',
    size: 1184,
    mtime: MODIFIED,
  },
} as const

export const CONFIG_TEXT = `export const PRICING_DEFAULTS = {
  currency: 'EUR',
  quoteTtlMinutes: 15,
  discountOrder: ['catalogue', 'basket', 'voucher'],
  rounding: 'half-even',
} as const
`

const DIAGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
<rect width="640" height="320" fill="#f6f7f9"/>
<rect x="40" y="120" width="150" height="80" rx="10" fill="#dbe7ff" stroke="#3b6fd8"/>
<text x="115" y="166" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#1d2b4f">Order service</text>
<rect x="245" y="120" width="150" height="80" rx="10" fill="#e3f5e9" stroke="#2f9b5b"/>
<text x="320" y="166" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#173d27">Pricing engine</text>
<rect x="450" y="120" width="150" height="80" rx="10" fill="#fdf0d8" stroke="#c98a12"/>
<text x="525" y="166" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#4d3505">Checkout</text>
<path d="M190 160 H245 M395 160 H450" stroke="#4a5568" stroke-width="2"/>
</svg>
`

/** A one-page PDF, its cross-reference table worked out from where each object starts. */
function onePagePdf(): string {
  const stream = 'BT /F1 24 Tf 72 720 Td (ZNR-780 pricing engine) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return pdf
}

function bytesOf(text: string): ArrayBuffer {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff
  return bytes.buffer
}

export const DIAGRAM_BYTES = bytesOf(DIAGRAM_SVG)
export const PDF_BYTES = bytesOf(onePagePdf())

const info = (absolute: string, size: number, type: string, ext: string) => ({
  absolutePath: `/Users/dev/compass-be/${absolute}`,
  size,
  type,
  ext,
  mtime: MODIFIED,
  ctime: CREATED,
})

/** Each state, read: fixed text and bytes, nothing on the network. */
export const FILE_PREVIEW_STATES: Record<FilePreviewFile, FilePreviewState> = {
  markdown: {
    status: 'ready',
    target: target(PROPOSAL_PATH),
    kind: 'markdown',
    text: PROPOSAL_TEXT,
    bytes: null,
    mediaType: 'text/plain',
    info: info(PROPOSAL_PATH, PROPOSAL_TEXT.length, 'markdown', 'md'),
  },
  html: {
    status: 'ready',
    target: target(PRICING_PAGE_PATH),
    kind: 'html',
    text: PRICING_PAGE_TEXT,
    bytes: null,
    mediaType: 'text/plain',
    info: info(PRICING_PAGE_PATH, PRICING_PAGE_TEXT.length, 'html', 'html'),
  },
  text: {
    status: 'ready',
    target: target('src/pricing/pricingDefaults.ts'),
    kind: 'text',
    text: CONFIG_TEXT,
    bytes: null,
    mediaType: 'text/plain',
    info: info('src/pricing/pricingDefaults.ts', CONFIG_TEXT.length, 'typescript', 'ts'),
  },
  image: {
    status: 'ready',
    target: target('docs/diagrams/pricing-flow.svg'),
    kind: 'image',
    text: null,
    bytes: DIAGRAM_BYTES,
    mediaType: 'image/svg+xml',
    info: info('docs/diagrams/pricing-flow.svg', DIAGRAM_BYTES.byteLength, 'image', 'svg'),
  },
  pdf: {
    status: 'ready',
    target: target('docs/ZNR-780_signed.pdf'),
    kind: 'pdf',
    text: null,
    bytes: PDF_BYTES,
    mediaType: 'application/pdf',
    info: info('docs/ZNR-780_signed.pdf', PDF_BYTES.byteLength, 'pdf', 'pdf'),
  },
  unknown: {
    status: 'ready',
    target: target('build/pricing-engine.zip'),
    kind: 'binary',
    text: null,
    bytes: null,
    mediaType: 'application/octet-stream',
    info: info('build/pricing-engine.zip', 2_480_128, 'zip', 'zip'),
  },
  loading: { status: 'loading', target: target(PROPOSAL_PATH) },
  error: {
    status: 'error',
    target: target(PROPOSAL_PATH),
    message: 'The backend is temporarily unavailable. Try again in a moment.',
  },
  gone: { status: 'gone', target: target('docs/ZNR-702_OLD_PROPOSAL.md') },
}

/** The reads a chip's Preview makes, answered from the fixtures for the proposal. */
export const FILE_PREVIEW_ROUTES = {
  'POST /api/v1/projects/{projectId}/files/read': () => ({ content: PROPOSAL_TEXT }),
  '/api/v1/projects/{projectId}/files/stats': () => [
    {
      relativePath: PROPOSAL_PATH,
      name: 'ZNR-780_PRICING_ENGINE_PROPOSAL.md',
      ...info(PROPOSAL_PATH, PROPOSAL_TEXT.length, 'markdown', 'md'),
    },
  ],
} as const

/** A file's state with the edits a person makes kept on the page: nothing is sent. */
export function useFakeEdits(file: FilePreviewFile) {
  const [state, setState] = useState<FilePreviewState>(FILE_PREVIEW_STATES[file])
  useEffect(() => setState(FILE_PREVIEW_STATES[file]), [file])
  return {
    state,
    onWrite: async (text: string) => setState((s) => (s.status === 'ready' ? { ...s, text } : s)),
    onRename: async (to: string) => setState((s) => ({ ...s, target: { ...s.target, path: to } })),
    onDelete: async () => setState((s) => ({ status: 'gone', target: s.target })),
  }
}
