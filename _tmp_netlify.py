import json
import subprocess
import time
import urllib.request

site_id = "987a8e55-1028-4fef-acfd-63934ca1589c"
want = "0666727"

for attempt in range(30):
    out = subprocess.check_output(
        f'npx netlify api listSiteDeploys --data "{{\\"site_id\\":\\"{site_id}\\"}}"',
        text=True,
        encoding="utf-8",
        shell=True,
    )
    # strip npm warnings
    start = out.find("[")
    data = json.loads(out[start:])
    latest = data[0]
    ref = (latest.get("commit_ref") or "")[:8]
    state = latest.get("state")
    print(f"attempt {attempt+1}: state={state} ref={ref} error={latest.get('error_message')}")
    if ref.startswith(want) and state == "ready":
        break
    if ref.startswith(want) and state in {"error", "failed"}:
        raise SystemExit("deploy failed")
    time.sleep(15)
else:
    raise SystemExit("timed out waiting for deploy")

urls = [
    "https://rentairportcars.com/en/car-rental-amsterdam-airport",
    "https://rentairportcars.com/ar/taajir-sayyarat-amsterdam-airport",
    "https://rentairportcars.com/en/car-rental-kutaisi-airport",
]
for url in urls:
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "rac-verify"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8", "replace")
        status = resp.status
    title = body.split("<title>", 1)[-1].split("</title>", 1)[0][:80]
    ok = "Utrecht" in body or "Prometheus" in body or "ماذا يشمل" in body or "What is included" in body
    print(status, url, title, ok)
