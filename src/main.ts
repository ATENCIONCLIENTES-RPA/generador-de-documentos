/* Punto de entrada del shell. Las librerías DOCX ya están cargadas como scripts clásicos desde index.html. */
import './styles/fonts.css';
import './styles/shell.css';
import './app/legacy-globals';
import { startShell } from './app/shell';
void startShell();
