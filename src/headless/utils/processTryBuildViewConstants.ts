/** The words of the "Try it on your phone" block, shared by web and native. */
export const PROCESS_TRY_BUILD_COPY = {
  title: 'Try it on your phone',
  building: 'Building the app…',
  ready: 'Ready to install',
  failed: 'The build failed',
  unavailable: 'No phone build for this run',
  failedNoReason: 'No reason was given.',
  download: 'Download the app',
  scanCaption: 'Scan with a phone on the same Wi-Fi',
  stepsTitle: 'What to check',
  open: (where: string) => `Open: ${where}`,
  accountNote: 'This build talks to the real services — sign in with your own test account.',
} as const

/** How long before its links stop working the block reads them again. */
export const PROCESS_TRY_BUILD_LINK_REFRESH_LEAD_MS = 30_000

/** The shortest wait before reading the links again, so an answer whose links already stopped is not read in a loop. */
export const PROCESS_TRY_BUILD_REFRESH_FLOOR_MS = 5_000
