"""Build lightweight SVG geography for the 41-country learning overview."""
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research/country-map"
SOURCE.mkdir(parents=True, exist_ok=True)
REVISION = "ca96624a56bd078437bca8184e78163e5039ad19"
for filename, scale in [("map-units.geojson", "110m"), ("map-units-50m.geojson", "50m")]:
    if not (SOURCE / filename).exists():
        url = f"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{REVISION}/geojson/ne_{scale}_admin_0_map_units.geojson"
        (SOURCE / filename).write_bytes(urllib.request.urlopen(url, timeout=45).read())
small = json.loads((SOURCE / "map-units.geojson").read_text(encoding="utf-8"))["features"]
large = json.loads((SOURCE / "map-units-50m.geojson").read_text(encoding="utf-8"))["features"]
countries = json.loads((ROOT / "research/country-cheatsheet/coverage.json").read_text(encoding="utf-8"))["coverage"]


def point(lon, lat):
    return [round((lon + 180) * 2.777778, 2), round((85 - lat) * 2.777778, 2)]


def geometry(feature):
    shape = feature["geometry"]
    polygons = shape["coordinates"] if shape["type"] == "MultiPolygon" else [shape["coordinates"]]
    paths = []
    for polygon in polygons:
        for ring in polygon:
            coords = [point(*p[:2]) for p in ring]
            paths.append("M" + "L".join(f"{x},{y}" for x, y in coords) + "Z")
    return "".join(paths)


def matches(feature, code):
    p = feature["properties"]
    if code == "GB":
        return p["GU_A3"] in ["ENG", "SCT", "WLS"]
    if code == "GB-ENG":
        return p["GU_A3"] == "ENG"
    if code == "NO":
        return p["GU_A3"] == "NOR"
    return p["ISO_A2"] == code


items = []
for country in countries:
    code = country["id"]
    features = [f for f in small if matches(f, code)]
    marker = not features
    if marker:
        features = [f for f in large if matches(f, code)]
    if not features:
        raise ValueError(f"Missing country geometry: {code}")
    label = next((f for f in features if code != "GB" or f["properties"]["GU_A3"] == "SCT"), features[0])["properties"]
    items.append({"id": code, "path": "".join(geometry(f) for f in features), "center": point(label["LABEL_X"], label["LABEL_Y"]), "marker": marker})
data = {"background": [geometry(f) for f in small if f["properties"]["NAME"] != "Antarctica"], "countries": items}
(ROOT / "platform/apps/web/generated/country-map.json").write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
report = {"source": "Natural Earth 110m / 50m admin-0 map units", "license": "Public domain", "countries": len(items), "smallCountryMarkers": [i["id"] for i in items if i["marker"]], "greatBritainUnits": ["England", "Scotland", "Wales"], "sourceHashes": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCE.glob("*.geojson")}}
(SOURCE / "map-build.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
