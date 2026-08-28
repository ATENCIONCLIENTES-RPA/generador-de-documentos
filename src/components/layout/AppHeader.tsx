import { Badge } from '@/components/ui/Badge';

interface Props {
  onNav?: (key: string) => void;
  activeKey?: string;
}

const NAV = [
  { key: 'plantillas', label: 'Plantillas' },
  { key: 'cargar', label: 'Cargar datos' },
  { key: 'generar', label: 'Generar' },
  { key: 'perfiles', label: 'Perfiles' },
];

export function AppHeader({ onNav, activeKey = 'plantillas' }: Props) {
  return (
    <header
      style={{
        height: 'var(--header-h)',
        background: '#fff',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-header)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-container)',
          margin: '0 auto',
          height: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src="/Logo 3.png" alt="ESSA" style={{ height: 34, width: 'auto' }} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--essa-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              ESSA · Generador Documental
            </div>
            <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              E.S.P. · Energía vital
            </div>
          </div>
          <Badge variant="accent" style={{ marginLeft: 8 }}>
            Vite
          </Badge>
        </div>

        {/* nav - desktop-first */}
        <nav aria-label="Principal" style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          {NAV.map((n) => {
            const active = n.key === activeKey;
            return (
              <button
                key={n.key}
                onClick={() => onNav?.(n.key)}
                aria-current={active ? 'page' : undefined}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? 'var(--essa-primary)' : 'transparent'}`,
                  background: active ? 'var(--essa-primary-50)' : 'transparent',
                  color: active ? 'var(--essa-primary)' : 'var(--neutral-600)',
                  fontWeight: active ? 800 : 600,
                  fontSize: '0.8125rem',
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>

        {/* spacer */}
        <div style={{ flex: 1 }} />

        {/* right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            title="Entorno local"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--neutral-500)',
              border: '1px solid var(--border)',
              padding: '4px 8px',
              borderRadius: 999,
              background: 'var(--neutral-50)',
            }}
          >
            Local
          </span>
          <div
            aria-label="Usuario"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--essa-primary) 0%, #0a6ad1 100%)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              border: '2px solid #fff',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
export default AppHeader;
