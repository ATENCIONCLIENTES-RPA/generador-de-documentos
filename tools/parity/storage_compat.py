#!/usr/bin/env python3
"""
Compatibilidad de DATOS original ↔ nuevo (IndexedDB «essa-modulo1»/«essa_cm» + localStorage). Sirve dist/ y la referencia desde el MISMO origen,
siembra datos con una versión, los lee con la otra (ambos sentidos) y comprueba que son idénticos, también con localStorage vacío (solo IndexedDB).
Uso: npm run build && python tools/parity/storage_compat.py
"""
import functools, http.server, os, pathlib, shutil, sys, tempfile, threading
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from parity_check import ROOT, DEFAULT_REF, make_data
SNAP = '''()=>{const s=AsistenteDocumental.store.getState();const out={};for(const k of s.order){const r=s.resources[k];out[k]={status:r.status,rows:r.rowCount,name:r.file&&r.file.name,items:r.file&&r.file.items&&r.file.items.map(i=>i.fileName)}}
 return {res:out,profile:AsistenteDocumental.store.getProfile(),notas:AsistenteDocumental.data.getItem('essa_marcas'),rutas:AsistenteDocumental.data.getJSON('essa_rutas',null)}}'''
def main():
    dist = ROOT / 'dist'
    if not (dist / 'index.html').exists(): sys.exit('Falta dist/: ejecuta primero `npm run build`.')
    site = pathlib.Path(tempfile.mkdtemp(prefix='ad-site-')); shutil.copytree(dist, site, dirs_exist_ok=True); shutil.copy(DEFAULT_REF, site / 'orig.html')
    data = pathlib.Path(tempfile.mkdtemp(prefix='ad-data-')); make_data(data)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(site)); handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}/'
    from playwright.sync_api import sync_playwright
    chromium = os.environ.get('CHROMIUM_PATH'); ok = True
    with sync_playwright() as pw:
        for first, second in (('orig.html', 'index.html'), ('index.html', 'orig.html')):
            b = pw.chromium.launch(executable_path=chromium, args=['--no-sandbox']) if chromium else pw.chromium.launch(args=['--no-sandbox'])
            ctx = b.new_context(viewport={'width':1440,'height':900}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(base+first); pg.wait_for_timeout(2500); rec = pg.frame_locator('#panel-recursos')
            rec.locator('section[data-key=sac] input[type=file]').set_input_files(str(data/'sac.xlsx')); pg.wait_for_timeout(2500)
            rec.locator('section[data-key=plantillas] input[webkitdirectory]').set_input_files(str(data/'tpl')); pg.wait_for_timeout(2500)
            pg.evaluate("AsistenteDocumental.store.setProfile({nombre:'Atención Clientes'});AsistenteDocumental.data.setItem('essa_marcas','{\"r1\":\"rojo\"}');AsistenteDocumental.data.setJSON('essa_rutas',{a:[1,2]})")
            pg.wait_for_timeout(1500); a = pg.evaluate(SNAP); pg.close()
            pg2 = ctx.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e))); pg2.goto(base+second); pg2.wait_for_timeout(5000); c = pg2.evaluate(SNAP)
            pg2.evaluate('localStorage.clear()'); pg2.goto(base+second); pg2.wait_for_timeout(5000); d = pg2.evaluate(SNAP)
            ok &= (a == c and a == d and not errs)
            print(f'{first} → {second}: hidratación idéntica={a==c} · recuperación desde IndexedDB sin localStorage={a==d} · errores={errs}'); b.close()
    srv.shutdown(); print('COMPATIBILIDAD DE DATOS OK' if ok else 'HAY DIFERENCIAS DE DATOS'); sys.exit(0 if ok else 1)
if __name__ == '__main__': main()
