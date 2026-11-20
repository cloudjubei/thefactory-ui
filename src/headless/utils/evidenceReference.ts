import { formatReference, formatVideoTime } from 'thefactory-tools/utils'

import type { ResolvedReviewEvidence, ReviewEvidenceRef } from '../api/generated'
import { EVIDENCE_MOMENT_LINK_PARAM } from './evidenceLinkConstants'
import {
  EVIDENCE_KIND_CAPTION,
  EVIDENCE_REFERENCE_COPY,
  EVIDENCE_REFERENCE_SHORT_ID,
  EVIDENCE_SEVERITY_TONE,
} from './evidenceReferenceConstants'
import type {
  EvidenceIssueDetail,
  EvidenceLink,
  EvidenceOpenAction,
  EvidenceOpenTarget,
  EvidenceReferenceCard,
  EvidenceReferenceInput,
  EvidenceReferenceView,
  EvidenceSeverityPill,
  EvidenceThumbnail,
} from './evidenceReferenceTypes'

/** The reference as an agent writes it, `&<projectId>/evidence/<evidenceId>[@<seconds>]`. Pure. */
export function evidenceCitation(link: EvidenceLink): string {
  return formatReference({
    kind: 'evidence',
    projectId: link.projectId,
    evidenceId: link.evidenceId,
    ...(link.at !== undefined ? { at: link.at } : {}),
  })
}

/** A media URL a page can load: a server-relative one with the backend in front of it. Pure. */
export function evidenceMediaUrl(url: string, apiBaseUrl?: string): string {
  if (!url.startsWith('/') || !apiBaseUrl) return url
  return `${apiBaseUrl.replace(/\/+$/, '')}${url}`
}

/** A moment as a chip says it — `0:08`, `1:30`, `1:02:05`. Pure. */
export function evidenceTime(at: number): string {
  return formatVideoTime(at).replace(/^0(\d:)/, '$1')
}

/** The moment an evidence page is opened at, from its query string. Pure. */
export function evidenceMomentOf(search: string): number | undefined {
  const raw = new URLSearchParams(search).get(EVIDENCE_MOMENT_LINK_PARAM)
  if (raw === null || raw.trim() === '') return undefined
  const at = Number(raw)
  return Number.isFinite(at) && at >= 0 ? at : undefined
}

/** What an issue says happened and where, from its run's filings; nothing for any other item. Pure. */
export function evidenceIssueDetail(
  refs: readonly ReviewEvidenceRef[],
  evidenceId: string,
): EvidenceIssueDetail | undefined {
  const issue = refs.find((ref) => ref.id === evidenceId)?.issue
  if (!issue) return undefined
  return { happened: issue.happened, ...(issue.view ? { view: issue.view } : {}) }
}

function shortCitation(link: EvidenceLink): string {
  const moment = link.at !== undefined ? `@${link.at}` : ''
  return `${link.projectId}/${link.evidenceId.slice(0, EVIDENCE_REFERENCE_SHORT_ID)}${moment}`
}

function momentOf(item: ResolvedReviewEvidence, link: EvidenceLink): number | undefined {
  return item.at ?? link.at
}

function joined(...parts: ReadonlyArray<string | undefined>): string | undefined {
  const kept = parts.filter((part): part is string => Boolean(part))
  return kept.length > 0 ? kept.join(' · ') : undefined
}

function issueView(
  item: ResolvedReviewEvidence,
  severity: NonNullable<ResolvedReviewEvidence['severity']>,
  link: EvidenceLink,
  issue: EvidenceIssueDetail | undefined,
  apiBaseUrl: string | undefined,
): Pick<EvidenceReferenceView, 'glyph' | 'severity' | 'card' | 'open'> {
  const pill: EvidenceSeverityPill = { label: severity, tone: EVIDENCE_SEVERITY_TONE[severity] }
  const at = momentOf(item, link)
  const time = at !== undefined ? evidenceTime(at) : undefined
  const where = joined(issue?.view, time)
  const shotUrl =
    item.media?.kind === 'image' ? evidenceMediaUrl(item.media.url, apiBaseUrl) : undefined
  const shot: EvidenceOpenTarget | undefined = shotUrl
    ? {
        kind: 'image',
        title: item.title,
        caption:
          joined(issue?.view, time ? EVIDENCE_REFERENCE_COPY.inRecording(time) : undefined) ??
          item.title,
        url: shotUrl,
        severity: pill,
      }
    : undefined
  const recording = item.recording
  const play: EvidenceOpenTarget | undefined =
    recording && recording.media.kind === 'video'
      ? {
          kind: 'video',
          title: item.title,
          caption: item.title,
          projectId: item.projectId,
          evidenceId: recording.evidenceId,
          mediaType: recording.media.mediaType,
          ...(at !== undefined ? { atSec: at } : {}),
        }
      : undefined
  const actions: EvidenceOpenAction[] = [
    ...(shot
      ? [{ label: EVIDENCE_REFERENCE_COPY.openScreenshot, target: shot, primary: true }]
      : []),
    ...(play
      ? [
          {
            label: time ? EVIDENCE_REFERENCE_COPY.playAt(time) : EVIDENCE_REFERENCE_COPY.play,
            target: play,
            primary: !shot,
          },
        ]
      : []),
  ]
  const thumbnail: EvidenceThumbnail | undefined = shotUrl
    ? { kind: 'image', url: shotUrl }
    : recording && play
      ? {
          kind: 'video',
          url: evidenceMediaUrl(recording.media.url, apiBaseUrl),
          ...(at !== undefined ? { atSec: at } : {}),
        }
      : undefined
  const card: EvidenceReferenceCard = {
    caption: EVIDENCE_REFERENCE_COPY.issue,
    title: item.title,
    severity: pill,
    lines: [
      ...(issue ? [{ label: EVIDENCE_REFERENCE_COPY.happened, value: issue.happened }] : []),
      ...(issue && where ? [{ label: EVIDENCE_REFERENCE_COPY.where, value: where }] : []),
      ...ownerLine(item),
    ],
    ...(thumbnail ? { thumbnail } : {}),
    actions,
  }
  const open = actions[0]?.target
  return { glyph: 'issue', severity: pill, card, ...(open ? { open } : {}) }
}

function ownerLine(item: ResolvedReviewEvidence): { label: string; value: string }[] {
  const step = item.owner?.stepName
  return step ? [{ label: EVIDENCE_REFERENCE_COPY.from, value: step }] : []
}

function mediaView(
  item: ResolvedReviewEvidence,
  link: EvidenceLink,
  apiBaseUrl: string | undefined,
): Pick<EvidenceReferenceView, 'glyph' | 'time' | 'card' | 'open'> {
  const caption = EVIDENCE_KIND_CAPTION[item.kind]
  const lines = ownerLine(item)
  const media = item.media
  if (!media) {
    return { glyph: 'file', card: { caption, title: item.title, lines, actions: [] } }
  }
  const url = evidenceMediaUrl(media.url, apiBaseUrl)
  if (media.kind === 'image') {
    const target: EvidenceOpenTarget = {
      kind: 'image',
      title: item.title,
      caption: joined(item.title, item.owner?.stepName) ?? item.title,
      url,
    }
    return {
      glyph: 'screenshot',
      card: {
        caption,
        title: item.title,
        lines,
        thumbnail: { kind: 'image', url },
        actions: [{ label: EVIDENCE_REFERENCE_COPY.open, target, primary: true }],
      },
      open: target,
    }
  }
  const at = momentOf(item, link)
  const time = at !== undefined ? evidenceTime(at) : undefined
  const target: EvidenceOpenTarget = {
    kind: 'video',
    title: item.title,
    caption: joined(item.title, item.owner?.stepName) ?? item.title,
    projectId: item.projectId,
    evidenceId: item.evidenceId,
    mediaType: media.mediaType,
    ...(at !== undefined ? { atSec: at } : {}),
  }
  return {
    glyph: 'recording',
    ...(time ? { time } : {}),
    card: {
      caption,
      title: item.title,
      lines,
      thumbnail: { kind: 'video', url, ...(at !== undefined ? { atSec: at } : {}) },
      actions: [
        {
          label: time ? EVIDENCE_REFERENCE_COPY.playAt(time) : EVIDENCE_REFERENCE_COPY.play,
          target,
          primary: true,
        },
      ],
    },
    open: target,
  }
}

/**
 * An evidence reference as its chip shows it: a screenshot, an issue with its
 * severity, or a recording with the time of its moment, each with the preview
 * its hover or long press shows and what a click opens in place — the
 * screenshot large, or the recording at the moment. Something gone reads
 * calmly as no longer kept; something on its way reads as plain evidence. Pure.
 */
export function evidenceReferenceView({
  link,
  state,
  issue,
  apiBaseUrl,
}: EvidenceReferenceInput): EvidenceReferenceView {
  const citation = evidenceCitation(link)
  const linkTime = link.at !== undefined ? evidenceTime(link.at) : undefined
  if (state.status === 'ready') {
    const { item } = state
    const shown = item.severity
      ? issueView(item, item.severity, link, issue, apiBaseUrl)
      : mediaView(item, link, apiBaseUrl)
    return { phase: 'ready', label: item.title, citation, ...shown }
  }
  if (state.status === 'gone') {
    return {
      phase: 'gone',
      glyph: 'gone',
      label: EVIDENCE_REFERENCE_COPY.evidence,
      ...(linkTime ? { time: linkTime } : {}),
      citation,
      card: {
        caption: EVIDENCE_REFERENCE_COPY.evidence,
        title: EVIDENCE_REFERENCE_COPY.goneTitle,
        lines: [
          { label: EVIDENCE_REFERENCE_COPY.goneWhy, value: EVIDENCE_REFERENCE_COPY.goneReason },
          { label: EVIDENCE_REFERENCE_COPY.citedAs, value: shortCitation(link) },
        ],
        actions: [],
      },
    }
  }
  const failed = state.status === 'failed'
  return {
    phase: state.status,
    glyph: link.at !== undefined ? 'recording' : 'file',
    label: EVIDENCE_REFERENCE_COPY.evidence,
    ...(linkTime ? { time: linkTime } : {}),
    citation,
    card: {
      caption: EVIDENCE_REFERENCE_COPY.evidence,
      title: failed ? EVIDENCE_REFERENCE_COPY.failedTitle : EVIDENCE_REFERENCE_COPY.loading,
      lines: failed ? [{ label: '', value: EVIDENCE_REFERENCE_COPY.failedBody }] : [],
      actions: [],
    },
  }
}
