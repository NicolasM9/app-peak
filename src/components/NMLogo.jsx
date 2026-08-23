// Logo NM Performance (recreación vectorial). Verde lima sobre transparente:
// en la pestaña se ve sobre fondo oscuro; en el informe va sobre una banda negra.
export default function NMLogo({ height = 48, word = true, color = '#c6f24e' }) {
  const vbW = 110, vbH = word ? 104 : 78
  return (
    <svg
      height={height}
      width={(height * vbW) / vbH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      fill="none"
      role="img"
      aria-label="NM Performance"
    >
      <g stroke={color} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
        {/* N */}
        <polyline points="14,66 14,18 44,66 44,18" />
        {/* M */}
        <polyline points="60,66 60,18 78,44 96,18 96,66" />
      </g>
      {word && (
        <text
          x={vbW / 2}
          y="96"
          textAnchor="middle"
          fontFamily="Anton, sans-serif"
          fontSize="15"
          letterSpacing="2.5"
          fill={color}
        >
          PERFORMANCE
        </text>
      )}
    </svg>
  )
}
