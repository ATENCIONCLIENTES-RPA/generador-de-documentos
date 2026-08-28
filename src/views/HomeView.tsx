import { EnergyIllustration } from '@/components/features/EnergyIllustration';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useNavigationStore } from '@/store/navigationStore';

interface HomeViewProps {
  onNavigate?: (step: string) => void;
}

export function HomeView({ onNavigate }: HomeViewProps): JSX.Element {
  const goTo = useNavigationStore((s) => s.goTo);

  const handleComenzar = () => {
    if (onNavigate) onNavigate('perfil');
    else goTo('perfil');
  };

  const features = [
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#004b93"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      title: 'Rápido',
      desc: 'Genera documentos en segundos con datos automatizados.',
    },
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#004b93"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: 'Seguro',
      desc: 'Tus datos permanecen seguros en tu navegador local.',
    },
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#004b93"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      title: 'Personalizado',
      desc: 'Adapta cada plantilla con variables específicas del caso.',
    },
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#004b93"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      ),
      title: 'En la nube',
      desc: 'Accede desde cualquier navegador sin instalaciones.',
    },
  ];

  return (
    <div data-testid="home-view" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .home-hero { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; align-items: center; }
        @media (max-width: 1024px) { .home-hero { grid-template-columns: 1fr; } }
        .home-card-icon { width: 44px; height: 44px; border-radius: 8px; background: var(--essa-primary-50); display: inline-flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe; flex-shrink:0; }
      `}</style>

      {/* Hero 12-col grid */}
      <div className="home-hero" data-testid="home-hero">
        {/* Left 7 cols */}
        <div
          style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: 14 }}
          data-testid="home-hero-left"
        >
          <div>
            <Badge
              variant="info"
              style={{
                background: '#eff6ff',
                borderColor: '#bfdbfe',
                color: '#004b93',
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
              }}
              data-testid="home-badge"
            >
              GENERADOR DE PLANTILLAS
            </Badge>
          </div>
          <h1
            data-testid="home-title"
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}
          >
            Generación documental <span style={{ color: '#004B93' }}>con Word</span>
          </h1>
          <p
            data-testid="home-description"
            style={{
              fontSize: '1.05rem',
              color: '#64748b',
              lineHeight: 1.65,
              maxWidth: 540,
            }}
          >
            Plataforma interna de ESSA para automatizar la generación de documentos oficiales a
            partir de plantillas Word y datos de clientes cargados desde archivos Excel.
          </p>
          <div style={{ marginTop: 4 }}>
            <Button
              variant="primary"
              size="lg"
              onClick={handleComenzar}
              data-testid="home-cta"
              aria-label="Comenzar Flujo"
            >
              Comenzar Flujo
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{ marginLeft: 6 }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Right 5 cols illustration */}
        <div
          style={{
            gridColumn: 'span 5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          data-testid="home-hero-right"
        >
          <EnergyIllustration />
        </div>
      </div>

      {/* Welcome + 4 cards */}
      <Card padding={28} data-testid="home-welcome-card">
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            Bienvenido al Generador
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
            Herramienta de uso interno para la creación automatizada de documentos oficiales ESSA.
          </p>
        </div>

        <div
          data-testid="home-features"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 18,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              data-testid={`feature-card-${f.title.toLowerCase()}`}
              style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span className="home-card-icon" style={{ width: 44, height: 44 }} aria-hidden>
                {f.icon}
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                {f.title}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45 }}>
                {f.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Cómo funciona 1→5 steps */}
        <div
          data-testid="home-como-funciona"
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 12,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            alignItems: 'flex-start',
          }}
        >
          <span aria-hidden style={{ color: '#004B93', marginTop: 2, flexShrink: 0 }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#004B93"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af', marginBottom: 4 }}
            >
              ¿Cómo funciona?
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.55 }}>
              1. Configura tu perfil y firma digital → 2. Carga el archivo Excel con datos de
              clientes → 3. Revisa y selecciona registros → 4. Elige la plantilla Word → 5.
              Previsualiza y genera los documentos finales en formato DOCX.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default HomeView;
