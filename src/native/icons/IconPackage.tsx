import Svg, { Path } from 'react-native-svg'

export function IconPackage({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M3 8l9 5 9-5" stroke="#A855F7" strokeWidth="2" />
      <Path d="M12 13v9" stroke="#3B82F6" strokeWidth="2" />
    </Svg>
  )
}
