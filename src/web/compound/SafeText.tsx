export type SafeTextProps = {
  text: string
  className?: string
}

export default function SafeText({ text, className }: SafeTextProps) {
  return (
    <pre className={['whitespace-pre-wrap break-words', className || ''].join(' ')}>{text}</pre>
  )
}
