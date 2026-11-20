import {
  PROJECT_CHECK_HOST_CONSENT_ALLOW,
  PROJECT_CHECK_HOST_CONSENT_LEAD,
  PROJECT_CHECK_HOST_CONSENT_TITLE,
  type ProcessWaitingView,
} from 'thefactory-ui/headless'

/** A developer parked until host checks are allowed — commands listed, Allow for this project. */
export const HOST_CHECK_CONSENT_WAITING_VIEW: ProcessWaitingView = {
  kind: 'permission',
  heading: 'The developer needs host checks allowed',
  title: PROJECT_CHECK_HOST_CONSENT_TITLE,
  words: [
    'No sandbox image has the Android SDK these checks need.',
    PROJECT_CHECK_HOST_CONSENT_LEAD,
  ].join('\n\n'),
  details: [],
  commands: ['npm run build', 'npm run typecheck', 'npm run test -- src/android'],
  transcriptLabel: 'Open the developer’s transcript →',
  choices: [
    {
      choice: 'allow',
      label: PROJECT_CHECK_HOST_CONSENT_ALLOW,
      detail: 'Store the allow for this project and run the checks on the host.',
      primary: true,
    },
    {
      choice: 'more-info',
      label: 'Provide more info',
      detail: 'Reply in words instead of allowing.',
    },
    {
      choice: 'abandon',
      label: 'Stop',
      detail: 'End the run without allowing host checks.',
    },
  ],
}
