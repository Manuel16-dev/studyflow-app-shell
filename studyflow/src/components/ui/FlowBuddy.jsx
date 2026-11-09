// Flow Buddy's face. The image is a circular crop in /public so it looks the
// same on light and dark themes.
export default function FlowBuddy({ size = 40, className = '' }) {
  return (
    <img
      src="/flow-buddy.webp"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full shrink-0 ${className}`}
    />
  )
}
