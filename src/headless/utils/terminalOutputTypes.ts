/** The sixteen colours a terminal's SGR codes name, as the dark terminal block draws them. */
export type TerminalColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite'

/** A run of output text in one style. */
export type TerminalSpan = {
  text: string
  /** `undefined` is the terminal's default foreground. */
  color: TerminalColor | undefined
  bold: boolean
  dim: boolean
}

/** Command output as the terminal block draws it: styled lines, and the plain text a copy takes. */
export type TerminalOutputView = {
  lines: TerminalSpan[][]
  plain: string
}
