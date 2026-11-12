import { MODEL } from '../calc/model.js';
import { $ } from '../lib/utils.js';
import { copyObservation, obsAutosize, obsCancelEdit, obsCount, obsRestoreAuto, obsSaveEdit, obsStartEdit } from '../observation/editor.js';
import { OCR } from '../ocr/engine.js';
import { S } from '../state.js';
import { clearQuery, syncAccount } from '../ui/account.js';
import { ddEnhance } from '../ui/dropdown.js';
import { setPill, toast } from '../ui/feedback.js';
import { invIsOpen, setInvOpen } from '../ui/fold.js';
import { onInvoiceInput } from '../ui/invoice.js';
import { confirmData, displayInput, drawOverlay, onImageChosen, processImage, removeImage } from '../ui/ocr-flow.js';
import { renderAll, resetApplication } from '../ui/render.js';
import { bindViewer, openViewer } from '../ui/viewer.js';

function bindDrop(el, onFiles, cls = 'drag') {
  ['dragenter', 'dragover'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add(cls); }));
  ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove(cls); }));
  el.addEventListener('drop', e => { const fs = [...(e.dataTransfer.files || [])]; if (fs.length) onFiles(fs); });
}
export function init() {
  $('#drop').onclick = () => $('#fileImg').click();
  $('#drop').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileImg').click(); } });
  $('#fileImg').onchange = e => { const f = e.target.files[0]; if (f) onImageChosen(f); e.target.value = ''; };
  bindDrop($('#drop'), fs => onImageChosen(fs[0])); bindDrop($('#prev'), fs => onImageChosen(fs[0]));
  $('#btnReplace').onclick = () => $('#fileImg').click();
  $('#btnRemove').onclick = removeImage;
  $('#btnOcr').onclick = processImage; $('#btnRerun').onclick = processImage;
  $('#btnConfirm').onclick = confirmData;
  document.addEventListener('paste', e => { const it = [...(e.clipboardData && e.clipboardData.items || [])].find(i => /^image\/(png|jpeg)$/.test(i.type)); if (it) { const f = it.getAsFile(); const nf = new File([f], 'captura-pegada.' + (it.type === 'image/png' ? 'png' : 'jpg'), { type: it.type }); onImageChosen(nf); } });
  let _accDeb;
  $('#qForm').onsubmit = e => { e.preventDefault(); clearTimeout(_accDeb); syncAccount({ strict: true }); };
  const liveAcc = () => { clearTimeout(_accDeb); _accDeb = setTimeout(() => syncAccount(), 300); };
  $('#qInput').addEventListener('input', () => { $('#qField').classList.remove('invalid'); liveAcc(); });
  $('#mInput').addEventListener('input', () => { $('#mField').classList.remove('invalid'); S.metaFor = null; liveAcc(); });
  $('#mUnit').addEventListener('change', () => { S.metaUnit = $('#mUnit').value; $('#mField').classList.remove('invalid'); liveAcc(); renderAll(); });
  $('#btnClear').onclick = () => { clearTimeout(_accDeb); clearQuery(); }; $('#btnResetAll').onclick = resetApplication;
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('select[data-k]')) { onInvoiceInput(t.dataset.k, t.value); renderAll(); }
  });
  document.addEventListener('input', e => {
    const t = e.target; if (!t.matches('input[data-k]')) return;
    onInvoiceInput(t.dataset.k, t.value);
    clearTimeout(t._deb); t._deb = setTimeout(() => {
      const pos = t.selectionStart; const k = t.dataset.k; const mirror = t.dataset.mirror;
      renderAll();
      const again = mirror ? $('input[data-k="cobro"][data-mirror]') : $(`#invBody input[data-k="${k}"]`);
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { } }
    }, 350);
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-useocr],[data-usesug],[data-clase],[data-usecta],[data-zoom],[data-view]'); if (!t) return;
    if (t.dataset.view) { openViewer(t.dataset.view); return; }
    if (t.dataset.useocr) { const k = t.dataset.useocr, f = S.inv[k]; f.value = f.ocrValue; f.text = displayInput(k, f.ocrValue); f.source = 'ocr'; f.conflict = false; f.status = S.confirmed ? 'confirmado' : 'revisar'; renderAll(); }
    if (t.dataset.usesug) { const k = t.dataset.usesug, f = S.inv[k]; f.value = f.suggest; f.text = displayInput(k, f.suggest); f.source = 'corregido'; f.status = ''; renderAll(); }
    if (t.dataset.clase) { S.claseChoice = t.dataset.clase; renderAll(); }
    if (t.dataset.usecta) {
      const previa = ($('#qInput').value || '').replace(/^0+(?=\d)/, ''), nueva = String(S.ocrCuenta).replace(/^0+(?=\d)/, '');
      if (previa && previa !== nueva && $('#mInput').value) { $('#mInput').value = ''; toast('warn', 'Ingresa la meta de la cuenta ' + S.ocrCuenta, 'La meta anterior pertenecía a la cuenta ' + previa + '.'); }
      $('#qInput').value = S.ocrCuenta; S.autoCuenta = S.ocrCuenta; syncAccount();
    }
    if (t.dataset.zoom) { $('#zoomImg').src = t.src; $('#zoom').classList.add('on'); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('#btnCopyObs')) copyObservation();
    else if (e.target.closest('#btnEditObs')) obsStartEdit();
    else if (e.target.closest('#btnObsSave')) obsSaveEdit();
    else if (e.target.closest('#btnObsCancel')) obsCancelEdit();
    else if (e.target.closest('#btnObsRestore')) obsRestoreAuto();
  });
  document.addEventListener('input', e => { if (e.target.id === 'obsEdit' && S.obsEdit) { S.obsEdit.draft = e.target.value; obsAutosize(e.target); obsCount(e.target); } });
  document.addEventListener('keydown', e => {
    if (e.target.id !== 'obsEdit') return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); obsCancelEdit(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); obsSaveEdit(); }
  });
  $('#zoom').onclick = () => $('#zoom').classList.remove('on');
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#zoom').classList.remove('on'); });
  $('#invBody').addEventListener('mouseover', e => { const r = e.target.closest('[data-row]'); if (!r) return; drawOverlay(r.dataset.row); });
  $('#invBody').addEventListener('mouseleave', () => drawOverlay());
  const net = () => { if (!OCR.worker && !OCR.custom) setPill('#pillOcr', navigator.onLine ? '' : 'warn', navigator.onLine ? 'OCR bajo demanda' : 'Sin conexión: OCR no disponible'); };
  addEventListener('online', net); addEventListener('offline', net); net();
  { const st = MODEL.selfTest; setPill('#pillFx', st.pass === st.total ? 'ok' : 'err', st.pass === st.total ? 'Calculadora integrada' : 'Calculadora: revisar'); }
  bindViewer();
  $('#invHead').addEventListener('click', () => setInvOpen(!invIsOpen()));
  ddEnhance();
  renderAll();
}
