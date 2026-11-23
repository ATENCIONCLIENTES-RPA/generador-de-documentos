import '../styles/fonts.css';
import { initMatricesModule } from '../modules/consultas/matrices';

function iniciar(): void {
  void initMatricesModule(document.getElementById('viewMatrices'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
else iniciar();
