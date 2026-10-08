import subprocess, time, os, shutil
from playwright.sync_api import sync_playwright

temp_user_data = r"C:\Users\MSI KATANA\Videos\ASISTENTE DOCUMENTAL\temp_edge_user_data"
if os.path.exists(temp_user_data):
    shutil.rmtree(temp_user_data, ignore_errors=True)

target_idb = os.path.join(temp_user_data, "Default", "IndexedDB", "http_localhost_4173.indexeddb.leveldb")
os.makedirs(os.path.dirname(target_idb), exist_ok=True)
src_idb = r"C:\Users\MSI KATANA\AppData\Local\Microsoft\Edge\User Data\Profile 2\IndexedDB\http_localhost_4173.indexeddb.leveldb"

shutil.copytree(src_idb, target_idb)

proc = subprocess.Popen(
    ["npx", "vite", "preview", "--port", "4173", "--strictPort"],
    cwd=r"C:\Users\MSI KATANA\Videos\ASISTENTE DOCUMENTAL",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    shell=True
)
time.sleep(2)

try:
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=temp_user_data,
            channel="msedge",
            headless=True
        )
        page = ctx.new_page()

        logs = []
        page_errors = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(f"PAGEERROR: {err}"))

        page.goto("http://localhost:4173/")
        
        for sec in range(10):
            time.sleep(1)
            is_blank = page.evaluate("() => document.body.innerText.trim() === ''")
            print(f"Sec {sec+1}: blank={is_blank}, frames={len(page.frames)}, title={page.title()}")
            for f in page.frames:
                try:
                    f_len = f.evaluate("() => document.body ? document.body.innerHTML.length : 0")
                    print(f"  Frame {f.url}: len={f_len}")
                except Exception as e:
                    print(f"  Frame {f.url}: err={e}")

        print("\n=== Console Logs ===")
        for l in logs:
            print(l)
        print("\n=== Page Errors ===")
        for e in page_errors:
            print(e)
            
        ctx.close()
finally:
    proc.terminate()
    try:
        proc.kill()
    except:
        pass
    shutil.rmtree(temp_user_data, ignore_errors=True)
