const Footer = () => {
  return (
    <footer className="app-footer" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderTop: '1px solid #e5e7eb',
      background: '#f9fafb',
      fontSize: '12px',
      color: '#6b7280',
    }}>
      <div>
        © 2025 ESSA - Electrificadora de Santander S.A. E.S.P. | Todos los derechos reservados.
      </div>
      <div>
        Versión 1.0.0
      </div>
    </footer>
  );
};
