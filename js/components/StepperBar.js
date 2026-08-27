const StepperBar = ({ currentStep, onSelectStep }) => {
  const steps = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'perfil', label: 'Perfil de trabajo' },
    { id: 'configuracion', label: 'Configuración' },
    { id: 'datos', label: 'Datos del documento' },
    { id: 'plantillas', label: 'Galería de plantillas' },
    { id: 'generacion', label: 'Generación' },
  ];
  const stepOrder = ['inicio', 'perfil', 'configuracion', 'datos', 'plantillas', 'generacion'];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="stepper-bar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 32px',
      background: 'linear-gradient(135deg, #001a3d 0%, #002f6c 50%, #004B93 100%)',
      gap: '0',
    }}>
      {steps.map((step, index) => {
        const isCompleted = currentIdx > index;
        const isActive = currentStep === step.id;
        const isPending = currentIdx < index;

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Step circle + label */}
            <div
              onClick={() => onSelectStep && onSelectStep(step.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                minWidth: '80px',
              }}
            >
              {/* Circle */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.3s ease',
                background: isCompleted
                  ? '#3b82f6'
                  : isActive
                    ? '#ffffff'
                    : 'rgba(255,255,255,0.15)',
                color: isCompleted
                  ? '#ffffff'
                  : isActive
                    ? '#004B93'
                    : 'rgba(255,255,255,0.5)',
                border: isCompleted
                  ? '2px solid #3b82f6'
                  : isActive
                    ? '2px solid #ffffff'
                    : '2px solid rgba(255,255,255,0.25)',
                boxShadow: isActive ? '0 0 0 3px rgba(59,130,246,0.3)' : 'none',
              }}>
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {/* Label */}
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : isCompleted ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div style={{
                width: '40px',
                height: '2px',
                margin: '0 4px',
                marginBottom: '18px',
                background: isCompleted
                  ? '#3b82f6'
                  : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
