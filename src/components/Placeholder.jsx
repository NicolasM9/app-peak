export default function Placeholder({ titulo, desc }) {
  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">{titulo}</h1>
      </div>
      <div className="pk-card" style={{ marginTop: 8 }}>
        <p className="muted" style={{ margin: 0 }}>
          🚧 {desc}
        </p>
      </div>
    </div>
  )
}
