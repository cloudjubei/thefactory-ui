import { SignoffReportPanel } from 'thefactory-ui/web'
import { reportBodyView } from 'thefactory-ui/headless'
import { processDocumentReportMarkdown } from 'thefactory-tools/utils'
import type { Scene } from '../showcase/types'

const REFERENCE = `---
title: FastContext
kind: repository
source: https://github.com/microsoft/fastcontext
links:
  - https://huggingface.co/papers/2606.14066
added: 2026-10-20
relevantTo: [thefactory-knowledge, thefactory-modeltrainer]
tags: [coding-agents, code-search, context-management]
verdict: study
---

# FastContext

## What it is
Microsoft Research's trained repository-exploration subagent for coding agents: a read-only explorer that returns \`path:line-range\` citations instead of file contents.

## Key ideas
- Exploration factored out of the solver keeps its context clean.
- Independent searches run in parallel.

## Where it fits
- **thefactory-knowledge** — the chat's code-search tools could hand a question to an explorer and get citations back.
- **thefactory-modeltrainer** — a small explorer model is a training target.

## Constraints
Token savings are the vendor's own figures, unverified.

## Verdict
study — read it before designing the knowledge explorer.

## Follow-ups
None.
`

const SECOND = `---
title: diff-cover
kind: repository
relevantTo: [thefactory-tools]
tags: []
verdict: watch
---

# diff-cover

## Verdict
watch — revisit when project checks gain coverage.
`

function DocumentReport({ documents }: { documents: { path: string; text: string }[] }) {
  const text = processDocumentReportMarkdown(documents)
  return (
    <div className="max-w-2xl px-4 pb-4">
      <SignoffReportPanel
        view={{ tiles: [], ...reportBodyView({ text, ref: {} }, []) }}
        hideTiles
      />
    </div>
  )
}

export const DOCUMENT_REPORT_SCENES: Scene[] = [
  {
    id: 'document-report',
    title: 'A report that shows the run’s documents',
    component: 'SignoffReportPanel',
    group: 'Process',
    description:
      'A report step that names `documents` (reference-intake’s Report: `refs/*.md`) runs no report writer: it shows each file the run wrote, as its work branch held them — the front matter as a table of fields, the body as written, then the file it came from. Its card leads with the document’s Verdict paragraph. Opened from the Report node of the run’s pipeline.',
    states: [
      {
        id: 'one-reference',
        title: 'One reference',
        description: 'The reference file an intake run wrote, as its Report.',
        render: () => (
          <DocumentReport documents={[{ path: 'refs/fastcontext.md', text: REFERENCE }]} />
        ),
      },
      {
        id: 'two-documents',
        title: 'Two documents',
        description:
          'Paired with One reference: a run that wrote two matching files shows both, divided by a rule; an empty list reads None.',
        render: () => (
          <DocumentReport
            documents={[
              { path: 'refs/fastcontext.md', text: REFERENCE },
              { path: 'refs/diff-cover.md', text: SECOND },
            ]}
          />
        ),
      },
    ],
  },
]
