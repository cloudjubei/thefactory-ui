import Svg, { Path } from 'react-native-svg'

export function IconBuild({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M14.7 6.3l3 3L7 20H4v-3z" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M13 5l6 6" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M2 22l2-5 3 3-5 2z" stroke="#A855F7" strokeWidth="2" />
    </Svg>
  )
}
