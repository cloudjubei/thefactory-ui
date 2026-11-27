import { Modal } from '../../primitives/Modal'
import SignInSessionPanel, { type SignInSessionPanelProps } from './SignInSessionPanel'

export type SignInSessionDialogProps = Omit<SignInSessionPanelProps, 'className'>

/**
 * A sign-in shown over whatever the person was on: nearly the whole window
 * on a desktop, the whole screen on a phone. It closes only by its Close
 * button or by itself: a press beside it or Escape, both easy to make while
 * signing in, leave it open.
 */
export default function SignInSessionDialog(props: SignInSessionDialogProps) {
  return (
    <Modal
      isOpen
      onClose={props.onClose}
      hideHeader
      closeOnEsc={false}
      closeOnOverlayClick={false}
      contentClassName="!p-0 flex min-h-0 flex-col !overflow-hidden"
      panelClassName="overflow-hidden sm:h-[min(820px,90vh)] sm:!max-w-[1100px] max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none max-sm:border-0"
    >
      <SignInSessionPanel {...props} />
    </Modal>
  )
}
