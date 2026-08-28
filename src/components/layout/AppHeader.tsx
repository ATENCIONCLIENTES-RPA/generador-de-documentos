import { Badge } from '@/components/ui/Badge';
import { useNavigationStore, type StepId } from '@/store/navigationStore';

const NAV: { key: StepId; label: string; short?: string }[] = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'perfil', label: 'Perfil' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'datos', label: 'Datos' },
  { key: 'plantillas', label: 'Plantillas' },
  { key: 'generacion', label: 'Generación' },
];

interface Props {
  activeKey?: string;
  onNav?: (key: string) => void;
}

export function AppHeader({ activeKey, onNav }: Props) {
  const storeCurrent = useNavigationStore((s) => s.currentStep);
  const storeGoTo = useNavigationStore((s) => s.goTo);
  const active = (activeKey ?? storeCurrent) as StepId;
  const handleNav = (key: StepId) => {
    if (onNav) onNav(key);
    else storeGoTo(key);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src="/Logo 3.png" alt="ESSA Electrificadora de Santander" style={{ height: 34, width: 'auto' }} />
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

        <nav aria-label="Principal" style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          {NAV.map((n) => {
            const isActive = n.key === active;
            return (
              <button
                key={n.key}
                onClick={() => handleNav(n.key)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Ir a ${n.label}`}
                data-testid={`header-nav-${n.key}`}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: `1px solid ${isActive ? 'var(--essa-primary)' : 'transparent'}`,
                  background: isActive ? 'var(--essa-primary-50)' : 'transparent',
                  color: isActive ? 'var(--essa-primary)' : 'var(--neutral-600)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

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
            aria-label="Usuario: Administrador"
            title="Administrador"
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
