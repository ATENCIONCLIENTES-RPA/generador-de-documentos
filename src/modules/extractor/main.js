import { init } from './app/init.js';
import { calculateResults, validateCalcInputs } from './calc/engine.js';
import { MODEL } from './calc/model.js';
import { excelRound } from './lib/format.js';
import { OBS_CONFIG, decidirCobroAdicional, generarObservacionConsumo, observationFromCalc, redactarObservacion, validarCobroAdicional, verificarCoherencia } from './observation/logic.js';
import { OCR } from './ocr/engine.js';
import { extractTargetFields, runOCR } from './ocr/extract.js';
import { preprocessImage } from './ocr/image.js';
import { parseDateText, parseNumberText, parsePeriodText } from './ocr/parse.js';
import { validateExtractedData } from './ocr/validate.js';
import { S, getPeriodData } from './state.js';
import { syncAccount } from './ui/account.js';

/* Aplicativo «Extractor de Datos» · Resolución CREG 101 120 de 2026.
   Punto de entrada: conecta las funciones de la aplicación y arranca la interfaz. */
import { initTheme } from './features/theme.js';
import { initMotion } from './features/motion.js';

/* Se conserva window.App tal como existía en el HTML original (consola del navegador y pruebas). */
window.App = { verificarCoherencia, validarCobroAdicional, decidirCobroAdicional, redactarObservacion, getPeriodData, parsePeriodText, parseDateText, S, OCR, MODEL, OBS_CONFIG, generarObservacionConsumo, observationFromCalc, validateCalcInputs, calculateResults, preprocessImage, runOCR, extractTargetFields, validateExtractedData, syncAccount, parseNumberText, excelRound };

/* La guía rápida sólo se descarga cuando alguien la abre (carga diferida). */
let guideReady = null;
document.getElementById('btnGuide').addEventListener('click', async () => {
  guideReady ??= import('./features/guide.js').then(m => m.initGuide());
  (await guideReady)();
});

/* Mismo orden de arranque que el HTML original: tema y movimiento primero, luego la interfaz. */
initTheme();
initMotion();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
