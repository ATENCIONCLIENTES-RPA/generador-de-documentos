export function AppFooter() {
  return (
    <>
      <style>{footerStyles}</style>
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="app-footer-copyright">
            © {new Date().getFullYear()} ESSA E.S.P. — Generador documental
          </span>
          <span className="app-footer-rights">Todos los derechos reservados</span>
        </div>
      </footer>
    </>
  );
}

const footerStyles = `
  .app-footer {
    border-top: 1px solid var(--border);
    background: rgba(255,255,255,0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 16px 24px;
  }
  .app-footer-inner {
    max-width: var(--max-container);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .app-footer-copyright {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--neutral-500);
    letter-spacing: -0.01em;
  }
  .app-footer-rights {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--neutral-400);
  }
`;

export default AppFooter;
