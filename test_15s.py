import subprocess, time
from playwright.sync_api import sync_playwright

proc = subprocess.Popen(
    ["npx", "vite", "preview", "--port", "4173", "--strictPort"],
    cwd=r"C:\Users\MSI KATANA\Videos\ASISTENTE DOCUMENTAL",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    shell=True
)

time.sleep(3)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="msedge")
        page = browser.new_page()

        console_logs = []
        page_errors = []

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(f"PAGEERROR: {err}"))

        print("Navigating to http://localhost:4173/ ...")
        page.goto("http://localhost:4173/")
        
        for sec in range(15):
            time.sleep(1)
            is_blank = page.evaluate("() => document.body.innerHTML.trim() === '' || document.body.innerText.trim() === ''")
            print(f"Sec {sec+1}: blank={is_blank}, frames={len(page.frames)}, title={page.title()}")
            for f in page.frames:
                try:
                    f_blank = f.evaluate("() => document.body ? document.body.innerHTML.length : 0")
                    print(f"   Frame {f.url}: body_len={f_blank}")
                except Exception as e:
                    print(f"   Frame {f.url}: error {e}")

        print("\nConsole logs:", len(console_logs))
        for l in console_logs:
            print(l)
        print("\nPage errors:", len(page_errors))
        for e in page_errors:
            print(e)
            
        browser.close()
finally:
    proc.terminate()
    try:
        proc.kill()
    except:
        pass
