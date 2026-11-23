import '../styles/fonts.css';
import { initCiiuModule } from '../modules/consultas/ciiu';

function iniciar(): void {
  initCiiuModule(document.getElementById('viewCiiu'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
else iniciar();
