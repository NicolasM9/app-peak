export default function Logo({ size = 76 }) {
  // "A" montaña con una mancuerna arriba (identidad de Peak Performance)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="4" width="4" height="12" rx="2" fill="#1a4fa3" />
      <rect x="34" y="4" width="4" height="12" rx="2" fill="#1a4fa3" />
      <rect x="13" y="7" width="22" height="4" rx="2" fill="#1a4fa3" />
      <path d="M24 12 L42 42 L30 42 L24 32 L18 42 L6 42 Z" fill="#1a4fa3" />
    </svg>
  )
}
