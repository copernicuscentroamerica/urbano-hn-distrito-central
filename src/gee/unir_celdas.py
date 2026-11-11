"""Une las franjas MDC_brecha_celda250_s*.geojson exportadas por src/gee/brecha_catastral_mdc.js

Uso: python3 src/gee/unir_celdas.py <carpeta_descargas> geovisor/capas/mdc_brecha_agregada.geojson geovisor/capas/mdc_perimetro_urbano_amdc.geojson
"""
import glob, json, sys
import pandas as pd
import geopandas as gpd

src, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(f"{src}/MDC_brecha_celda250_s*.geojson"))
def leer(f):
    g = gpd.read_file(f)
    # las celdas completas de coveringGrid se exportan en UTM 16N aunque el archivo diga WGS84
    if abs(g.total_bounds).max() > 180:
        g = g.set_crs(32616, allow_override=True).to_crs(4326)
    return g.set_crs(4326, allow_override=True)
c = gpd.GeoDataFrame(pd.concat([leer(f) for f in fs], ignore_index=True), crs=4326)
c = c.drop(columns=[x for x in ("SECTOR", "MANZANA", "id", "m2_valido") if x in c.columns])
# Recorte al perímetro (las franjas recalculadas con celdas completas vienen sin recortar)
if len(sys.argv) > 3:
    pu = gpd.read_file(sys.argv[3]).to_crs(4326).union_all()
    c["geometry"] = c.geometry.intersection(pu)
c = c[c.geometry.notna()]
c = c[~c.geometry.is_empty]
# solo polígonos (el recorte al perímetro puede dejar fragmentos lineales)
c = c.explode(index_parts=False)
c = c[c.geom_type == "Polygon"]
c = c.dissolve(by="unidad", aggfunc="first").reset_index()
c = c.explode(index_parts=False)
print("franjas", len(fs), "celdas", c.unidad.nunique(), "polígonos", len(c))

for col in c.columns:
    if col.startswith(("p_", "cobertura")):
        c[col] = c[col].astype(float).round(3)
    elif col in ("ha", "dens_edif_ha", "area_media_m2", "m2_edif", "m2_fuera", "n_edif", "n_edif_fuera", "n_lotes"):
        c[col] = c[col].astype(float).round(1)
c["brecha_catastral"] = c["brecha_catastral"].astype(bool)
c.to_file(out, driver="GeoJSON", COORDINATE_PRECISION=6)

u = c.drop_duplicates("unidad")
tot = u[["n_edif", "n_edif_fuera", "m2_edif", "m2_fuera", "ha"]].sum()
con = u[u.m2_edif > 0]
print(json.dumps({
    "celdas": int(len(u)), "celdas_con_edificacion": int(len(con)),
    "ha": round(tot.ha), "edificaciones": round(tot.n_edif), "edificaciones_fuera": round(tot.n_edif_fuera),
    "p_edif_fuera": round(tot.n_edif_fuera / max(tot.n_edif, 1), 3),
    "m2_edif": round(tot.m2_edif), "m2_fuera": round(tot.m2_fuera),
    "p_m2_fuera": round(tot.m2_fuera / max(tot.m2_edif, 1), 3),
    "celdas_con_brecha": int(u.brecha_catastral.sum()),
    "ha_celdas_con_brecha": round(u[u.brecha_catastral].ha.sum()),
    "edif_en_celdas_con_brecha": round(u[u.brecha_catastral].n_edif.sum()),
    "tipologia_brecha": u.tipologia_brecha.value_counts().to_dict(),
    "tipologia": u.tipologia.value_counts().to_dict(),
}, ensure_ascii=False, indent=1))
