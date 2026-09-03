import Svg, { Path } from 'react-native-svg'

export function IconShield({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path
        d="M12 3l7 3v6c0 4.418-3.582 8-7 8s-7-3.582-7-8V6l7-3z"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      <Path d="M12 7v8" stroke="#10B981" strokeWidth="2" />
      <Path d="M9 11h6" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
