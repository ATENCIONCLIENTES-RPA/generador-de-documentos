export function AppFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: '#fff',
        padding: '14px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-container)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: '0.75rem',
          color: 'var(--neutral-500)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          © {new Date().getFullYear()} ESSA E.S.P. · Generador documental · Brand #004B93 · #76BC21
        </span>
        <span style={{ display: 'inline-flex', gap: 12, fontWeight: 600 }}>
          <span>Vite + React + TS</span>
          <span aria-hidden>·</span>
          <span>easy-template-x + PizZip</span>
        </span>
      </div>
    </footer>
  );
}
export default AppFooter;
