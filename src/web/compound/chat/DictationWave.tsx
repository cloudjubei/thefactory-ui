/**
 * Visual indicator shown while dictation is active. Five vertical bars
 * scale on a staggered animation so the composer reads as "the mic is
 * live" without doing any actual real-time audio analysis (which would
 * require parallel `getUserMedia` access on top of the engine that's
 * already consuming the mic). Most chat apps show the same illusion.
 *
 * Keyframes are declared inline via a scoped `<style>` block so the
 * component drops into any consumer's Tailwind pipeline without
 * requiring config changes.
 */
const KEYFRAMES_CSS = `
@keyframes thefactory-dictation-wave {
  0%, 100% { transform: scaleY(0.35); }
  50%      { transform: scaleY(1); }
}
`

const BAR_STYLE: React.CSSProperties = {
  display: 'block',
  width: 3,
  height: 18,
  borderRadius: 2,
  background: 'var(--accent-primary)',
  transformOrigin: 'center',
  animation: 'thefactory-dictation-wave 1.2s ease-in-out infinite',
}

const DELAYS_MS = [0, 120, 240, 360, 480]

export default function DictationWave({ className }: { className?: string }) {
  return (
    <>
      <style>{KEYFRAMES_CSS}</style>
      <div
        className={`inline-flex items-center justify-center gap-0.5 ${className ?? ''}`}
        aria-hidden="true"
        style={{ height: 22 }}
      >
        {DELAYS_MS.map((delay) => (
          <span key={delay} style={{ ...BAR_STYLE, animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </>
  )
}
