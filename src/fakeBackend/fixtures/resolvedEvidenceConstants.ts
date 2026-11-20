/** The picture the fake shows for every screenshot it resolves, inline so it needs no file route. */
export const FAKE_EVIDENCE_IMAGE_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNjQwIDQwMCI+PHJlY3Qgd2lkdGg9IjY0MCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxZjJhMzgiLz48cmVjdCB4PSIyNCIgeT0iMjQiIHdpZHRoPSI1OTIiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjMmUzZTUyIi8+PHJlY3QgeD0iNDgiIHk9IjEwNCIgd2lkdGg9IjI1NiIgaGVpZ2h0PSI0MCIgcng9IjYiIGZpbGw9IiMzZjU4NzMiLz48cmVjdCB4PSI0OCIgeT0iMTYwIiB3aWR0aD0iMjU2IiBoZWlnaHQ9IjQwIiByeD0iNiIgZmlsbD0iIzNmNTg3MyIvPjxyZWN0IHg9IjQ4IiB5PSIyMzIiIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiIHJ4PSI2IiBmaWxsPSIjZDk1MzRmIi8+PHRleHQgeD0iNDgiIHk9IjM3MiIgZm9udC1mYW1pbHk9IkhlbHZldGljYSIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzlmYjJjNyI+RmFrZSBzY3JlZW5zaG90PC90ZXh0Pjwvc3ZnPgo='

/** The six-second clip the fake plays for every recording it resolves, inline as the picture is. */
export const FAKE_EVIDENCE_VIDEO_URL =
  'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAO+EU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEdTbuMU6uEHFO7a1OsggOo7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjAuMy4xMDBXQYxMYXZmNjAuMy4xMDBEiYhAt3AAAAAAABZUrmvCrgEAAAAAAAA514EBc8WIbM/SopaOR36cgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QdzWUA4IqwggFAuoHImoECElTDZ/tzc59jwIBnyJlFo4dFTkNPREVSRIeMTGF2ZjYwLjMuMTAwc3PWY8CLY8WIbM/SopaOR35nyKBFo4dFTkNPREVSRIeTTGF2YzYwLjMuMTAwIGxpYnZweGfIokWjiERVUkFUSU9ORIeUMDA6MDA6MDYuMDAwMDAwMDAwAAAfQ7Z1Qd3ngQCjQKGBAACAcBAAnQEqQAHIAABHCIWFiIWEiAICAnWqAgZmZPcGgWSfa9ubJzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7Jzh7JsgA/v72ov9qYJIyl/18AU8SAKOdgQH0ALECAAEQEAAYABhYL/QACIAEM1+tck+cAACjnYED6ACxAgABEBAAGAAYWC/0AAiABDNfrXJPnAAAo52BBdwAsQIAARAQABgAGFgv9AAIgAQzX61yT5wAAKOdgQfQALECAAEQEAAYABhYL/QACIAEM1+tck+cAACjnYEJxACxAgABEBAAGAAYWC/0AAiABDNfrXJPnAAAo52BC7gAsQIAARAQABgAGFgv9AAIgAQzX61yT5wAAKOdgQ2sALECAAEQEBRgAGFgv9AAIgAQzX61yT5wAACjnYEPoACxAgABEBAAGAAYWC/0AAiABDNfrXJPnAAAo52BEZQAsQIAARAQABgAGFgv9AAIgAQzX61yT5wAAKOdgROIALECAAEQEAAYABhYL/QACIAEM1+tck+cAAAfQ7Z1o+eCFXyjnYEAAACxAgABEBAAGAAYWC/0AAiABDNfrXJPnAAAHFO7a5G7j7OBALeK94EB8YIBnfCBAw=='

/** When the inline media "expires": never while a scene is shown, as a data URL holds its own bytes. */
export const FAKE_EVIDENCE_MEDIA_EXPIRES_AT = '2099-01-01T00:00:00.000Z'

/** A reference to a filed item, as the tools' reference grammar spells it. */
export const FAKE_EVIDENCE_REFERENCE =
  /^&(?:([A-Za-z0-9][A-Za-z0-9_-]*)\/)?evidence\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:@(\d+(?:\.\d+)?))?$/

export const FAKE_EVIDENCE_TARGET_NOT_EVIDENCE = (reference: string): string =>
  `“${reference}” is not a reference to review evidence: write it as \`&<projectId>/evidence/<evidenceId>\`, with \`@<seconds>\` for a moment.`

export const FAKE_EVIDENCE_TARGET_NO_PROJECT =
  'Name the project the evidence is in: a reference with its project, or a projectId.'

export const FAKE_EVIDENCE_TARGET_NO_ID = 'Name the evidence: a reference, or an evidenceId.'

export const FAKE_EVIDENCE_TARGET_AMBIGUOUS = 'Give a reference or an evidenceId, not both.'

export const FAKE_EVIDENCE_TARGET_BAD_MOMENT = (at: string): string =>
  `at must be a number of seconds, 0 or more, not '${at}'.`

export const FAKE_EVIDENCE_NOT_FOUND = (projectId: string, evidenceId: string): string =>
  `No fake evidence '${evidenceId}' in '${projectId}'.`
