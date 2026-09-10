"""Fetch the fixed flag-icons revision used by the country learning sheet."""
import concurrent.futures
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVISION = "086f7e97d657358203916dbe84f61c2bccaa81eb"
OUT = ROOT / "platform/apps/web/public/flags"
OUT.mkdir(parents=True, exist_ok=True)
rows = json.loads((ROOT / "research/country-cheatsheet/coverage.json").read_text(encoding="utf-8"))["coverage"]


def download(row):
    code = row["id"].lower()
    url = f"https://raw.githubusercontent.com/lipis/flag-icons/{REVISION}/flags/4x3/{code}.svg"
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read()
    if b"<svg" not in data or b"<script" in data:
        raise ValueError(f"Unexpected flag data: {code}")
    (OUT / f"{code}.svg").write_bytes(data)
    return {"country": row["id"], "path": f"flags/{code}.svg", "sha256": hashlib.sha256(data).hexdigest()}


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    assets = list(pool.map(download, rows))
with urllib.request.urlopen(f"https://raw.githubusercontent.com/lipis/flag-icons/{REVISION}/LICENSE", timeout=30) as response:
    (OUT / "LICENSE.txt").write_bytes(response.read())
audit = ROOT / "research/country-map"
audit.mkdir(parents=True, exist_ok=True)
(audit / "flag-manifest.json").write_text(json.dumps({"source": "https://github.com/lipis/flag-icons", "revision": REVISION, "assets": assets}, indent=2) + "\n")
print(f"{len(assets)} flags saved")
