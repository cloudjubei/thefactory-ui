import Svg, { Path } from 'react-native-svg'

export function IconAgent({ size = 24, color }: { size?: number; color?: string }) {
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
        d="M12 3l2.2 5.3L19.5 10.5l-5.3 2.2L12 18l-2.2-5.3L4.5 10.5l5.3-2.2z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <Path d="M19 16l.8 1.9 1.9.8-1.9.8L19 21.4l-.8-1.9-1.9-.8 1.9-.8z" fill="currentColor" />
    </Svg>
  )
}
