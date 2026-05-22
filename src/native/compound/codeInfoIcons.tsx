import type { ReactNode } from 'react'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { IconWrench } from '../icons/IconWrench'

/**
 * Known programming-language keys used by project code-info. Native peer of
 * `src/web/compound/codeInfoIcons.tsx`'s `CodeInfoLanguage` — must stay
 * aligned across platforms.
 */
export type CodeInfoLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'go'
  | 'ruby'
  | 'php'
  | 'csharp'
  | 'cpp'
  | 'rust'
  | 'kotlin'
  | 'swift'
  | 'other'
  | (string & {})

function AbbrevIcon({
  bg,
  fg,
  text,
  size = 16,
}: {
  bg: string
  fg: string
  text: string
  size?: number
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect x="0" y="0" width="16" height="16" rx="3" fill={bg} />
      <SvgText x="8" y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill={fg}>
        {text}
      </SvgText>
    </Svg>
  )
}

/**
 * Compact square icon for a programming language. Falls back to a wrench
 * icon for `'other'` or anything unrecognised. Native peer of the web
 * `renderLanguageIcon` — kept structurally identical so chips look the same
 * on every client.
 */
export function renderLanguageIcon(language?: CodeInfoLanguage, size = 16): ReactNode {
  switch (language) {
    case 'javascript':
      return <AbbrevIcon bg="#F7DF1E" fg="#111827" text="JS" size={size} />
    case 'typescript':
      return <AbbrevIcon bg="#3178C6" fg="#FFFFFF" text="TS" size={size} />
    case 'python':
      return <AbbrevIcon bg="#3776AB" fg="#FFD43B" text="PY" size={size} />
    case 'java':
      return <AbbrevIcon bg="#E76F00" fg="#FFFFFF" text="JV" size={size} />
    case 'go':
      return <AbbrevIcon bg="#00ADD8" fg="#FFFFFF" text="GO" size={size} />
    case 'ruby':
      return <AbbrevIcon bg="#CC342D" fg="#FFFFFF" text="RB" size={size} />
    case 'php':
      return <AbbrevIcon bg="#777BB4" fg="#FFFFFF" text="PHP" size={size} />
    case 'csharp':
      return <AbbrevIcon bg="#68217A" fg="#FFFFFF" text="C#" size={size} />
    case 'cpp':
      return <AbbrevIcon bg="#00599C" fg="#FFFFFF" text="C++" size={size} />
    case 'rust':
      return <AbbrevIcon bg="#DEA584" fg="#111827" text="RS" size={size} />
    case 'kotlin':
      return <AbbrevIcon bg="#7F52FF" fg="#FFFFFF" text="KT" size={size} />
    case 'swift':
      return <AbbrevIcon bg="#FA7343" fg="#FFFFFF" text="SW" size={size} />
    case 'other':
    default:
      return <IconWrench size={size} />
  }
}
