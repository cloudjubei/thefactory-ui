import { FEATURE_REPORT_APPROACH } from 'thefactory-tools/constants'
import type { EvidenceTile } from 'thefactory-ui/headless'
import type { ReviewEvidenceRef } from '../../src/headless/api/generated'

/**
 * Settled, on every build:
 * - Web `/?scene=superseded-filings&state=collapsed` and native
 *   `?view=superseded-filings&state=collapsed`: the current feature report
 *   ("The change is in") is open. Under it, a closed row labelled Superseded,
 *   reading "1 report · 1 screenshot".
 * - `&state=open`: the same current report, and that row open. Inside, each
 *   filing is labelled Superseded: "Feature report, first try" with its text,
 *   then "Settings, after — first try".
 */
const ATTEMPT = 'attempt-2'

function filing(
  id: string,
  label: string,
  text: string | undefined,
  createdAt: number,
  kind: ReviewEvidenceRef['kind'],
  superseded: boolean,
): EvidenceTile {
  const ref = {
    id,
    runId: 'run-review',
    projectId: 'showcase',
    kind,
    path: `${id}.md`,
    label,
    ...(kind === 'report' ? { approach: FEATURE_REPORT_APPROACH } : {}),
    mediaType: kind === 'report' ? 'text/markdown' : 'image/png',
    bytes: text?.length ?? 12,
    createdAt,
    ...(superseded ? { supersededBy: { attemptId: ATTEMPT } } : {}),
  } as ReviewEvidenceRef
  return { ref, caption: label, ...(text ? { text } : {}) }
}

export const SUPERSEDED_FILINGS_CURRENT: EvidenceTile[] = [
  filing(
    'current-report',
    'Feature report',
    'The change is in.\n\nThis try’s review passed.',
    1_700_000_000_000,
    'report',
    false,
  ),
]

export const SUPERSEDED_FILINGS_REPLACED: EvidenceTile[] = [
  filing(
    'replaced-report',
    'Feature report, first try',
    'The first try failed the build, so it was run again.',
    1_600_000_002_000,
    'report',
    true,
  ),
  filing(
    'replaced-shot',
    'Settings, after — first try',
    undefined,
    1_600_000_001_000,
    'screenshot',
    true,
  ),
]
