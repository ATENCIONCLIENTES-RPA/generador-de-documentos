const EssaLogo = ({ variant = 'header' }) => {
  const colors = {
    primary: '#004B93',
    accent: '#76BC21',
    light: '#ffffff',
  };

  if (variant === 'light') {
    return (
      <div className="essa-logo essa-logo--light" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke={colors.light} strokeWidth="4" fill="none" />
          <path d="M50 10 A40 40 0 0 1 90 50" stroke={colors.accent} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M30 70 L50 25 L70 70" stroke={colors.light} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="38" y1="55" x2="62" y2="55" stroke={colors.light} strokeWidth="3" />
        </svg>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: colors.light, letterSpacing: '1px' }}>
            ESSA
          </div>
          <div style={{ fontSize: '10px', color: colors.light, opacity: 0.85, letterSpacing: '0.5px' }}>
            grupo<span style={{ color: colors.accent }}>•</span>epm
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="essa-logo essa-logo--compact" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke={colors.primary} strokeWidth="4" fill="none" />
          <path d="M50 10 A40 40 0 0 1 90 50" stroke={colors.accent} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M30 70 L50 25 L70 70" stroke={colors.primary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="38" y1="55" x2="62" y2="55" stroke={colors.primary} strokeWidth="3" />
        </svg>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: colors.primary, letterSpacing: '1px' }}>
            ESSA
          </div>
          <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.5px' }}>
            grupo<span style={{ color: colors.accent }}>•</span>epm
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'document') {
    return (
      <div className="essa-logo essa-logo--document" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke={colors.primary} strokeWidth="4" fill="none" />
            <path d="M50 10 A40 40 0 0 1 90 50" stroke={colors.accent} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M30 70 L50 25 L70 70" stroke={colors.primary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="38" y1="55" x2="62" y2="55" stroke={colors.primary} strokeWidth="3" />
          </svg>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: colors.primary, letterSpacing: '2px' }}>
              ESSA
            </div>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.5px' }}>
              grupo<span style={{ color: colors.accent }}>•</span>epm
            </div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '2px' }}>
          Electrificadora de Santander
        </div>
      </div>
    );
  }

  // Default: header
  return (
    <div className="essa-logo essa-logo--header" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke={colors.primary} strokeWidth="4" fill="none" />
        <path d="M50 10 A40 40 0 0 1 90 50" stroke={colors.accent} strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M30 70 L50 25 L70 70" stroke={colors.primary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="38" y1="55" x2="62" y2="55" stroke={colors.primary} strokeWidth="3" />
      </svg>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: colors.primary, letterSpacing: '1px' }}>
          ESSA
        </div>
        <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.5px' }}>
          grupo<span style={{ color: colors.accent }}>•</span>epm
        </div>
      </div>
    </div>
  );
};

const EssaLogoHeader = () => <EssaLogo variant="header" />;
const EssaLogoDocument = () => <EssaLogo variant="document" />;
const EssaLogoCompact = () => <EssaLogo variant="compact" />;
const EssaLogoLight = () => <EssaLogo variant="light" />;
