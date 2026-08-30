import { useNavigationStore, type StepId } from '@/store/navigationStore';

const NAV: { key: StepId; label: string; icon: string }[] = [
  {
    key: 'inicio',
    label: 'Inicio',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2',
  },
  {
    key: 'perfil',
    label: 'Perfil',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    key: 'datos',
    label: 'Datos',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  },
  {
    key: 'plantillas',
    label: 'Plantillas',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    key: 'generacion',
    label: 'Generar documento',
    icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
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
    <>
      <style>{headerStyles}</style>
      <header className="app-header">
        <div className="app-header-inner">
          {/* Logo + Brand */}
          <div className="app-header-brand">
            <div className="app-header-logo">
              <img
                src={`${import.meta.env.BASE_URL}Logo 3.png`}
                alt="ESSA Electrificadora de Santander"
              />
            </div>
            <div className="app-header-brand-text">
              <span className="app-header-brand-name">ESSA</span>
              <span className="app-header-brand-sep">·</span>
              <span className="app-header-brand-sub">Generador Documental</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="app-header-nav" aria-label="Principal">
            {NAV.map((n) => {
              const isActive = n.key === active;
              return (
                <button
                  key={n.key}
                  onClick={() => handleNav(n.key)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Ir a ${n.label}`}
                  data-testid={`header-nav-${n.key}`}
                  className={`app-nav-btn ${isActive ? 'app-nav-btn--active' : ''}`}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={n.icon} />
                  </svg>
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="app-header-spacer" />
        </div>
      </header>
    </>
  );
}

const headerStyles = `
  @keyframes headerShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .app-header {
    height: var(--header-h);
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: var(--z-header);
  }
  .app-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--essa-primary) 0%, var(--essa-accent) 33%, var(--essa-primary) 66%, var(--essa-accent) 100%);
    background-size: 200% 100%;
    animation: headerShimmer 6s linear infinite;
  }
  .app-header-inner {
    max-width: var(--max-container);
    margin: 0 auto;
    height: 100%;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  /* ── Brand ── */
  .app-header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex-shrink: 0;
  }
  .app-header-logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--essa-primary-50) 0%, #dbeafe 100%);
    box-shadow: 0 2px 6px rgba(0,75,147,0.12);
    transition: transform 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .app-header-logo:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0,75,147,0.18);
  }
  .app-header-logo img {
    height: 28px;
    width: auto;
  }
  .app-header-brand-text {
    display: flex;
    align-items: baseline;
    gap: 6px;
    white-space: nowrap;
  }
  .app-header-brand-name {
    font-weight: 900;
    font-size: 1rem;
    color: var(--essa-primary);
    letter-spacing: -0.02em;
  }
  .app-header-brand-sep {
    color: var(--neutral-300);
    font-weight: 300;
    font-size: 0.875rem;
  }
  .app-header-brand-sub {
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--neutral-600);
    letter-spacing: -0.01em;
  }

  /* ── Navigation ── */
  .app-header-nav {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .app-nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--neutral-500);
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 200ms var(--ease);
    white-space: nowrap;
    position: relative;
  }
  .app-nav-btn:hover {
    color: var(--essa-primary);
    background: var(--essa-primary-50);
    border-color: rgba(0,75,147,0.08);
  }
  .app-nav-btn--active {
    color: var(--essa-primary);
    background: var(--essa-primary-50);
    border-color: rgba(0,75,147,0.15);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0,75,147,0.1);
  }
  .app-nav-btn svg {
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 200ms var(--ease);
  }
  .app-nav-btn:hover svg,
  .app-nav-btn--active svg {
    opacity: 1;
  }

  .app-header-spacer {
    flex: 1;
  }

  @media (max-width: 900px) {
    .app-header-brand-sub { display: none; }
    .app-header-brand-sep { display: none; }
    .app-nav-btn span { display: none; }
    .app-nav-btn { padding: 0 10px; }
    .app-nav-btn svg { width: 18px; height: 18px; }
  }
`;

export default AppHeader;
