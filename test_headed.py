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

time.sleep(2)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="msedge")
        page = browser.new_page()

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: logs.append(f"PAGEERROR: {err}"))

        page.goto("http://localhost:4173/")
        
        for i in range(10):
            time.sleep(1)
            is_blank = page.evaluate("() => document.body.innerText.trim() === ''")
            print(f"Sec {i+1}: blank={is_blank}, title={page.title()}")
            if is_blank:
                print("BLANK DETECTED! Logs:")
                for l in logs:
                    print(l)
                page.screenshot(path=r"C:\Users\MSI KATANA\Videos\ASISTENTE DOCUMENTAL\blank_debug.png")
                break
        
        browser.close()
finally:
    proc.terminate()
    try:
        proc.kill()
    except:
        pass
