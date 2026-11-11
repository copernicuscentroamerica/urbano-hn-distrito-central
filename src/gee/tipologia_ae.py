"""Tipología A–E (Anexo A de la ficha N.° 8) a partir de la brecha por celdas de 250 m.

Uso: python3 tipologia_ae.py <brecha.geojson> <zonas_riesgo.geojson> <salida.geojson>

Reglas (umbrales preliminares, a calibrar en la validación):
  E · Brecha en condición crítica: ≥10 % fuera de predio y (≥30 % de lo construido en pendiente ≥30 %
      o ≥30 % de la celda dentro de zona de riesgo AMDC)
  D · Ocupación reciente: ≥50 % fuera de predio y ≥50 % de lo construido aparecido después de 2016
  C · Informal consolidado: ≥50 % fuera de predio
  B · Catastrado con brecha: ≥10 % fuera de predio
  A · Formal consolidado: <10 % fuera de predio
"""
import sys, json
import numpy as np
import geopandas as gpd

brecha, riesgo, out = sys.argv[1:4]
c = gpd.read_file(brecha).to_crs(32616)
r = gpd.read_file(riesgo).to_crs(32616).union_all()

# Proxy de zona de riesgo: proporción del área de la celda dentro de zonas de riesgo AMDC
# (se asume que lo construido se reparte de forma pareja dentro de la celda).
c["p_riesgo"] = (c.geometry.intersection(r).area / c.geometry.area.clip(lower=1)).round(3)

pf, pn, pc, pr = c.p_fuera_catastro, c.p_nuevo, c.p_critico, c.p_riesgo
sin = c.m2_edif <= 0
codigo = np.select(
    [sin, (pf >= 0.10) & ((pc >= 0.30) | (pr >= 0.30)), (pf >= 0.50) & (pn >= 0.50), pf >= 0.50, pf >= 0.10],
    ["0", "E", "D", "C", "B"], "A")
nombres = {"0": "Sin edificación", "A": "A · Formal consolidado", "B": "B · Catastrado con brecha",
           "C": "C · Informal consolidado", "D": "D · Ocupación reciente",
           "E": "E · Brecha en condición crítica"}
c["tipo_ae"] = codigo
c["tipologia_ae"] = [nombres[k] for k in codigo]
c = c[c.tipo_ae != "0"]   # las celdas sin edificación no se dibujan

keep = ["unidad", "tipo_ae", "tipologia_ae", "ha", "n_edif", "n_edif_fuera", "p_fuera_catastro",
        "p_nuevo", "p_critico", "p_riesgo", "geometry"]
c[keep].to_crs(4326).to_file(out, driver="GeoJSON", COORDINATE_PRECISION=6)

u = c.drop_duplicates("unidad")
res = u.groupby("tipologia_ae").agg(celdas=("unidad", "size"), ha=("ha", "sum"),
                                    edif=("n_edif", "sum"), edif_fuera=("n_edif_fuera", "sum")).round(0)
print(res.to_string())
print("celdas E por riesgo AMDC (no por pendiente):",
      int(((u.tipo_ae == "E") & (u.p_critico < 0.30)).sum()))
