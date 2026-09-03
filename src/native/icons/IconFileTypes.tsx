import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg'

export function IconFileBadge({
  badgeText,
  fill,
  stroke,
  textColor,
  size = 20,
}: {
  badgeText?: string
  fill: string
  stroke: string
  textColor?: string
  size?: number
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="18" rx="2" fill={fill} stroke={stroke} />
      {badgeText ? (
        <SvgText
          x="12"
          y="16"
          textAnchor="middle"
          fontSize={badgeText.length > 2 ? 8 : 9}
          fill={textColor}
          fontFamily="monospace"
        >
          {badgeText}
        </SvgText>
      ) : null}
    </Svg>
  )
}

export function IconFileJson({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="18" rx="2" fill="#ecf7ff" stroke="#8ed0ff" />
      <Path
        d="M9 9c-2 0-2 6 0 6M15 9c2 0 2 6 0 6"
        stroke="#1c7ed6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function IconFileImage({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="18" rx="2" fill="#ecfdf5" stroke="#b2f2bb" />
      <Path d="M6 17l4-5 3 4 2-3 3 4H6z" fill="#40c057" />
      <Circle cx="9" cy="9" r="1.5" fill="#37b24d" />
    </Svg>
  )
}

export function IconFileZip({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="18" rx="2" fill="#fff9db" stroke="#ffe8a1" />
      <Path d="M12 6v12M12 6h2M12 9h2M12 12h2M12 15h2" stroke="#e67700" strokeWidth="1.5" />
    </Svg>
  )
}

export function IconFileText({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="18" rx="2" fill="#f8f9fa" stroke="#dee2e6" />
      <Path d="M6 8h10M6 11h10M6 14h8" stroke="#495057" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  )
}

export function IconFileDefault({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2" fill="#f5f6f8" stroke="#d9dbe1" />
      <Path d="M8 8h8M8 12h8M8 16h6" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  )
}
