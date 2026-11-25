import '../styles/fonts.css';
import { initMatricesModule } from '../modules/consultas/matrices';

function iniciar(): void {
  void initMatricesModule(document.getElementById('viewMatrices'));
  /* El CSS ya está aplicado: se muestra el documento sin destellos. */
  document.body.style.visibility = 'visible';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
else iniciar();
