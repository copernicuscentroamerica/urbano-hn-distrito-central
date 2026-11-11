"""Une las franjas MDC_temporalidad_anual_celda250_s*.geojson exportadas por src/gee/temporalidad_mdc.js
y estima, por celda de 250 m, cuándo se consolidó lo construido.

Uso:
  python3 src/gee/temporalidad_celdas.py <carpeta_descargas> \
      geovisor/capas/mdc_perimetro_urbano_amdc.geojson \
      geovisor/capas/mdc_huella_multitemporal.geojson \
      [geovisor/capas/mdc_tipologias_ae.geojson]

Fuentes (preliminar, sin validación de campo):
  ob_m2_AAAA  Open Buildings 2.5D Temporal: m² de huella cuyo primer año con building_presence >= 0.5 es AAAA (2016–2023)
  dw_m2_AAAA  Dynamic World: m² cuyo primer año "construido" estable (estación seca de AAAA y AAAA+1) es AAAA (2016–2025)

Calibración de la línea base. Ninguna de las dos fuentes detecta completo lo que ya existía en 2016
(en 2016 solo operaba Sentinel-2A y hay menos escenas). Se usa como zona de control el centro de
Tegucigalpa y Comayagüela (consolidado hace décadas): el año base de cada fuente es el primero en que la
zona de control aparece consolidada en al menos UMBRAL_CONTROL; además, un año con un salto anómalo de
superficie nueva en toda la ciudad (FACTOR_SALTO) se suma a la línea base. Todo lo detectado hasta el año
base se considera existente; lo que aparece después es crecimiento estimado.
"""
import glob, json, sys
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

UMBRAL_CONTROL = 0.95
CONTROL = [(-87.2068, 14.1058), (-87.2130, 14.0990)]   # centro histórico de Tegucigalpa y de Comayagüela
RADIO_CONTROL_M = 800
ANIOS_OB = list(range(2016, 2024))
ANIOS_DW = list(range(2016, 2026))

src, pu_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
tipos_path = sys.argv[4] if len(sys.argv) > 4 else None
fs = sorted(glob.glob(f"{src}/MDC_temporalidad_anual_celda250_s*.geojson"))


def leer(f):
    g = gpd.read_file(f)
    if abs(g.total_bounds).max() > 180:  # celdas completas exportadas en UTM 16N
        g = g.set_crs(32616, allow_override=True).to_crs(4326)
    return g.set_crs(4326, allow_override=True)


c = gpd.GeoDataFrame(pd.concat([leer(f) for f in fs], ignore_index=True), crs=4326).drop_duplicates("unidad")
num = [x for x in c.columns if x.startswith(("m2_", "ob_", "dw_"))]
c[num] = c[num].astype(float).fillna(0)

# --- Zona de control y año base de cada fuente
zona = gpd.GeoSeries([Point(p) for p in CONTROL], crs=4326).to_crs(32616).buffer(RADIO_CONTROL_M).to_crs(4326).union_all()
ctrl = c[c.intersects(zona)]


def curva(df, pref, anios, total):
    acum = df[[f"{pref}_m2_{a}" for a in anios]].sum().cumsum() / df[total].sum()
    return {a: round(float(v), 3) for a, v in zip(anios, acum)}


c["ob_m2_con_anio"] = c[[f"ob_m2_{a}" for a in ANIOS_OB]].sum(axis=1)
ctrl = c.loc[ctrl.index]
curva_ob = curva(ctrl, "ob", ANIOS_OB, "ob_m2_con_anio")
curva_dw = curva(ctrl, "dw", ANIOS_DW, "dw_m2_urbano")
base_ob = next((a for a in ANIOS_OB if curva_ob[a] >= UMBRAL_CONTROL), ANIOS_OB[-1])
base_dw = next((a for a in ANIOS_DW if curva_dw[a] >= UMBRAL_CONTROL), ANIOS_DW[-1])
# Fuera de la zona de control, 2016 también subdetecta (sobre todo en la periferia de baja densidad):
# un año cuya superficie nueva supera FACTOR_SALTO veces la mediana de los años siguientes se
# considera rezago de detección y se suma a la línea base.
FACTOR_SALTO = 3
_con = c[c.m2_edif >= 200]
ha_anual = {a: _con[f"dw_m2_{a}"].sum() / 1e4 for a in ANIOS_DW}
while base_dw < ANIOS_DW[-2]:
    sig = pd.Series([ha_anual[a] for a in ANIOS_DW if a > base_dw + 1])
    if ha_anual[base_dw + 1] > FACTOR_SALTO * sig.median():
        base_dw += 1
    else:
        break
corte_dw = (base_dw + ANIOS_DW[-1] + 1) // 2 + 1   # divide el crecimiento posterior en dos periodos

# --- Indicadores por celda
e = c.m2_edif.where(c.m2_edif > 0)
du = c.dw_m2_urbano.where(c.dw_m2_urbano > 0)
ob_nuevo = c[[f"ob_m2_{a}" for a in ANIOS_OB if a > base_ob]].sum(axis=1)
dw_nuevo = c[[f"dw_m2_{a}" for a in ANIOS_DW if a > base_dw]].sum(axis=1)
dw_anio_x = sum(c[f"dw_m2_{a}"] * a for a in ANIOS_DW if a > base_dw)

c["ha"] = (c.m2_valido / 1e4).round(2)
c["p_ob_nuevo"] = (ob_nuevo / c.ob_m2_con_anio.where(c.ob_m2_con_anio > 0)).round(3)
c["p_ob_sin_anio"] = (c.ob_m2_sin_anio / e).round(3)
c["p_dw_urbano"] = (c.dw_m2_urbano / c.m2_valido).round(3)
c["p_dw_nuevo"] = (dw_nuevo / du).round(3)
c["ha_dw_nuevo"] = (dw_nuevo / 1e4).round(2)
c["anio_dw_nuevo"] = (dw_anio_x / dw_nuevo.where(dw_nuevo > 0)).round(1)
c["m2_edif"] = c.m2_edif.round(0)
BASE = f"Consolidada a {base_dw}"
P1 = f"Crecimiento {base_dw + 1}–{corte_dw - 1}"
P2 = f"Crecimiento {corte_dw}–{ANIOS_DW[-1]}"
DISPERSA = "Edificación dispersa (no detectada por Dynamic World)"


def periodo(r):
    if r.m2_edif < 200:
        return "Sin edificación"
    if r.p_dw_urbano < 0.05:
        return DISPERSA
    if (r.p_dw_nuevo or 0) < 0.25:
        return BASE
    return P1 if r.anio_dw_nuevo < corte_dw else P2


def concordancia(r):
    if r.periodo in ("Sin edificación", DISPERSA):
        return "Sin dato comparable"
    ob, dw = (r.p_ob_nuevo or 0) >= 0.25, (r.p_dw_nuevo or 0) >= 0.25
    if ob and dw:
        return "Ambas fuentes: crecimiento"
    if ob:
        return "Solo Open Buildings"
    if dw:
        return "Solo Dynamic World"
    return "Ambas fuentes: consolidada"


c["periodo"] = c.apply(periodo, axis=1)
c["concordancia"] = c.apply(concordancia, axis=1)

pub = ["unidad", "ha", "m2_edif", "p_dw_urbano", "p_dw_nuevo", "ha_dw_nuevo", "anio_dw_nuevo",
       "p_ob_nuevo", "p_ob_sin_anio", "periodo", "concordancia", "geometry"]
s = c[pub].copy()
pu = gpd.read_file(pu_path).to_crs(4326).union_all()
s["geometry"] = s.geometry.intersection(pu)
s = s[~s.geometry.is_empty].explode(index_parts=False)
s = s[s.geom_type == "Polygon"].dissolve(by="unidad", aggfunc="first").reset_index()
s = s[s.periodo != "Sin edificación"]
s.to_file(out, driver="GeoJSON", COORDINATE_PRECISION=6)

con = c[c.periodo != "Sin edificación"]
res = {
    "franjas": len(fs), "celdas": int(len(c)), "celdas_con_edificacion": int(len(con)),
    "celdas_control": int(len(ctrl)),
    "curva_control_ob": curva_ob, "curva_control_dw": curva_dw,
    "anio_base_ob": base_ob, "anio_base_dw": base_dw, "periodos": [BASE, P1, P2],
    "ha_dw_por_anio": {a: round(float(con[f"dw_m2_{a}"].sum() / 1e4)) for a in ANIOS_DW},
    "ha_ob_por_anio": {a: round(float(con[f"ob_m2_{a}"].sum() / 1e4), 1) for a in ANIOS_OB},
    "dw_ha_urbano": round(con.dw_m2_urbano.sum() / 1e4),
    "dw_ha_crecimiento": round(dw_nuevo[con.index].sum() / 1e4),
    "ob_p_crecimiento": round(ob_nuevo[con.index].sum() / con.ob_m2_con_anio.sum(), 3),
    "periodo": con.periodo.value_counts().to_dict(),
    "concordancia": con.concordancia.value_counts().to_dict(),
}
if tipos_path:
    t = gpd.read_file(tipos_path)[["unidad", "tipo_ae"]].drop_duplicates("unidad")
    m = con.merge(t, on="unidad", how="inner")
    res["por_tipo_ae"] = {
        k: {"celdas": int(len(g)),
            "p_ob_nuevo_mediana": round(float(g.p_ob_nuevo.fillna(0).median()), 3),
            "p_dw_nuevo_mediana": round(float(g.p_dw_nuevo.fillna(0).median()), 3),
            "periodo": g.periodo.value_counts().to_dict()}
        for k, g in m.groupby("tipo_ae")}
print(json.dumps(res, ensure_ascii=False, indent=1))
