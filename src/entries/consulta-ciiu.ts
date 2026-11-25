import '../styles/fonts.css';
import { initCiiuModule } from '../modules/consultas/ciiu';

function iniciar(): void {
  initCiiuModule(document.getElementById('viewCiiu'));
  /* El CSS ya está aplicado: se muestra el documento sin destellos. */
  document.body.style.visibility = 'visible';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
else iniciar();
