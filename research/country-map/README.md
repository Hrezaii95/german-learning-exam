# Country overview release

The existing 41-name country inventory is the sole selection set. The overview
adds 41 self-hosted SVG flags, a four-group article chart, and an interactive map.
Selecting a country updates the map detail and existing sentence builder.

Natural Earth map units distinguish England from Scotland and Wales. Great
Britain uses those three units, excluding Northern Ireland; the interface explains
its use of the UK's Union flag. Singapore, Liechtenstein, Maldives, Andorra,
Monaco and Mauritius receive explicit small-country markers.

Rebuild geography with `python tools/build-country-map.py`. Missing source files
are downloaded from the pinned Natural Earth revision in that script. Rebuild
flags with `python tools/build-country-flags.py`; the MIT license is shipped with
the flags. Exact input/asset checksums are retained in the adjacent manifests.

Verification covers selected-country coverage, England/Great Britain geometry,
markers, flag bytes, map keyboard interaction, region zoom, full-screen focus
return, chart selection, existing sentence-builder synchronization, and mobile
overflow. Browser evidence is stored under `dev`, `export`, and `live`.
