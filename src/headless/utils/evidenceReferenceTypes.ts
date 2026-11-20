import type { ResourceLink } from 'thefactory-tools/types'
import type { ResolvedReviewEvidence } from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** A link to one filed item of review evidence, at a moment of its recording when it names one. */
export type EvidenceLink = Extract<ResourceLink, { kind: 'evidence' }>

/** An evidence item as it was read: still on its way, there, gone, or not readable right now. */
export type EvidenceReferenceState =
  | { status: 'loading' }
  | { status: 'ready'; item: ResolvedReviewEvidence }
  | { status: 'gone' }
  | { status: 'failed' }

/** What an issue says about itself beyond its title, read from its run's filings. */
export type EvidenceIssueDetail = {
  happened: string
  view?: string
}

/** The glyph an evidence chip shows, by what the item is. */
export type EvidenceGlyph = 'screenshot' | 'issue' | 'recording' | 'file' | 'gone'

/** What a click on an evidence item opens: its screenshot large, or its recording at the moment. */
export type EvidenceOpenTarget =
  | {
      kind: 'image'
      title: string
      caption: string
      url: string
      severity?: EvidenceSeverityPill
    }
  | {
      kind: 'video'
      title: string
      caption: string
      projectId: string
      evidenceId: string
      mediaType: string
      atSec?: number
    }

/** One button of an evidence preview, and what it opens. */
export type EvidenceOpenAction = {
  label: string
  target: EvidenceOpenTarget
  primary: boolean
}

/** An issue's severity as its pill reads. */
export type EvidenceSeverityPill = { label: string; tone: ProcessStatusTone }

/** The still an evidence preview shows: the screenshot, or the recording's frame at its moment. */
export type EvidenceThumbnail =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string; atSec?: number }

/** What hovering (web) or long-pressing (native) an evidence chip shows. */
export type EvidenceReferenceCard = {
  caption: string
  title: string
  severity?: EvidenceSeverityPill
  lines: ReadonlyArray<{ label: string; value: string }>
  thumbnail?: EvidenceThumbnail
  actions: readonly EvidenceOpenAction[]
}

/** An evidence reference as its chip shows it, from what was read of it. */
export type EvidenceReferenceView = {
  phase: EvidenceReferenceState['status']
  glyph: EvidenceGlyph
  label: string
  /** The moment of a recording, as its player says it: "1:30". */
  time?: string
  severity?: EvidenceSeverityPill
  /** The reference as an agent writes it, `&<projectId>/evidence/<evidenceId>[@<seconds>]`. */
  citation: string
  card: EvidenceReferenceCard
  /** What a click on the chip opens in place; absent, the click follows the link. */
  open?: EvidenceOpenTarget
}

/** What the evidence view is drawn from. */
export type EvidenceReferenceInput = {
  link: EvidenceLink
  state: EvidenceReferenceState
  issue?: EvidenceIssueDetail
  /** Where the backend is served from, put in front of a server-relative media URL. */
  apiBaseUrl?: string
}

/** Reads one evidence item; resolves `undefined` when it is gone. */
export type EvidenceReferenceLoad = (
  link: EvidenceLink,
) => Promise<ResolvedReviewEvidence | undefined>

/** How long items are kept and when a held item's media grant is read afresh. */
export type EvidenceReferenceStoreOptions = {
  capacity: number
  /** A held item is read again this long before its media grant runs out. */
  renewBeforeMs: number
  now: () => number
}
