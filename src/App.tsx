import './styles/globals.css';

export default function App(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-page)',
      }}
    >
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--neutral-100)',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 'var(--max-container)',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <img src="/Logo 3.png" alt="ESSA" style={{ height: 36 }} />
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: 'var(--essa-primary)',
              letterSpacing: '0.02em',
            }}
          >
            ESSA · Generador Documental
          </span>
          <span
            style={{
              marginLeft: 'auto',
              background: 'var(--essa-accent)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '4px 10px',
              borderRadius: 'var(--radius-badge)',
            }}
          >
            VITE OK
          </span>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          maxWidth: 'var(--max-container)',
          width: '100%',
          margin: '0 auto',
          padding: '48px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--neutral-100)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-md)',
            padding: '40px 48px',
            textAlign: 'center',
            maxWidth: 560,
            width: '100%',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--essa-primary)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 20,
              marginBottom: 16,
            }}
          >
            ✓
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--essa-primary)',
              marginBottom: 8,
            }}
          >
            ESSA Vite OK
          </h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14 }}>
            Scaffold Vite + React + TypeScript + Zustand + easy-template-x + PizZip listo.
            <br />
            <span style={{ fontSize: 12 }}>Brand #004B93 · #76BC21 · Plus Jakarta Sans · max 1600px</span>
          </p>
        </div>
      </main>
    </div>
  );
}
