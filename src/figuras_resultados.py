"""Genera las figuras de resultados preliminares del sitio a partir de las capas
agregadas publicadas en geovisor/capas/ (celdas de 250 m, sin datos por predio).

Uso:
    python3 src/figuras_resultados.py

Salida: web/assets/img/figuras/figura_*.png

Las celdas que el recorte al perímetro urbano divide en varias partes repiten
sus atributos; se cuentan una sola vez por identificador `unidad`.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = Path(__file__).resolve().parents[1]
CAPAS = ROOT / "geovisor" / "capas"
OUT = ROOT / "web" / "assets" / "img" / "figuras"

INK = "#1f2933"
MUTED = "#616e7c"
GRID = "#e4e7eb"

for f in font_manager.findSystemFonts():
    if "Roboto" in f:
        font_manager.fontManager.addfont(f)
plt.rcParams.update({
    "font.family": "Roboto" if any("Roboto" in f.name for f in font_manager.fontManager.ttflist) else "DejaVu Sans",
    "font.size": 10,
    "text.color": INK,
    "axes.labelcolor": MUTED,
    "axes.edgecolor": GRID,
    "xtick.color": MUTED,
    "ytick.color": INK,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.dpi": 150,
})


def cargar(nombre: str) -> list[dict]:
    feats = json.loads((CAPAS / nombre).read_text(encoding="utf-8"))["features"]
    unicos: dict[str, dict] = {}
    for f in feats:
        unicos.setdefault(f["properties"]["unidad"], f)
    return list(unicos.values())


def fmt(n: float) -> str:
    return f"{n:,.0f}".replace(",", ".")


def titular(fig, titulo: str, sub: str, nota: str) -> None:
    fig.text(0.02, 0.965, titulo, fontsize=13, fontweight="bold", va="top")
    fig.text(0.02, 0.905, sub, fontsize=9.5, color=MUTED, va="top")
    fig.text(0.02, 0.02, nota, fontsize=8, color=MUTED, va="bottom")


def barras_h(ax, etiquetas, valores, colores, textos, titulo_eje):
    y = range(len(etiquetas))
    ax.barh(list(y), valores, color=colores, height=0.62, edgecolor="white", linewidth=1)
    ax.set_yticks(list(y), etiquetas)
    ax.invert_yaxis()
    ax.set_title(titulo_eje, fontsize=10, color=MUTED, loc="left")
    ax.xaxis.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", length=0)
    vmax = max(valores) or 1
    for i, (v, t) in enumerate(zip(valores, textos)):
        ax.text(v + vmax * 0.015, i, t, va="center", fontsize=9, color=INK)
    ax.set_xlim(0, vmax * 1.28)
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: fmt(v)))


def figura_brecha(brecha: list[dict]) -> None:
    clases = [
        ("< 10 %", 0, 0.10, "#fcbba1"),
        ("10–25 %", 0.10, 0.25, "#fc9272"),
        ("25–50 %", 0.25, 0.50, "#ef3b2c"),
        ("≥ 50 % (brecha)", 0.50, 1.01, "#a50f15"),
    ]
    con_edif = [f["properties"] for f in brecha if f["properties"]["n_edif"] > 0]
    celdas, edif = [], []
    for _, lo, hi, _ in clases:
        sel = [p for p in con_edif if lo <= p["p_fuera_catastro"] < hi]
        celdas.append(len(sel))
        edif.append(sum(p["n_edif"] for p in sel))
    n = sum(p["n_edif"] for p in con_edif)
    nf = sum(p["n_edif_fuera"] for p in con_edif)
    fig, axs = plt.subplots(1, 2, figsize=(10, 4.4), gridspec_kw={"wspace": 0.55})
    fig.subplots_adjust(top=0.74, bottom=0.17, left=0.13, right=0.97)
    etiquetas = [c[0] for c in clases]
    colores = [c[3] for c in clases]
    barras_h(axs[0], etiquetas, celdas, colores, [fmt(v) for v in celdas], "Celdas de 250 m con edificación")
    barras_h(axs[1], etiquetas, edif, colores, [fmt(v) for v in edif], "Edificaciones (Open Buildings v3)")
    titular(
        fig,
        "Brecha catastral por celda: % de lo construido fuera de predio",
        f"{fmt(n)} edificaciones; {fmt(nf)} ({str(round(nf / n * 100, 1)).replace('.', ',')} %) fuera de predio catastrado",
        "Resultado preliminar. Fuente: capa mdc_brecha_agregada (Open Buildings v3 × parcelario AMDC 2026, agregado a 250 m).",
    )
    fig.savefig(OUT / "figura_1_brecha_catastral_por_clase.png", facecolor="white")
    plt.close(fig)


def figura_tipologia(tipos: list[dict]) -> None:
    orden = [
        ("A", "A · Formal consolidado", "#1a9850"),
        ("B", "B · Catastrado con brecha", "#fee08b"),
        ("C", "C · Informal consolidado", "#f46d43"),
        ("D", "D · Ocupación reciente", "#d73027"),
        ("E", "E · Brecha en condición crítica", "#67001f"),
    ]
    props = [f["properties"] for f in tipos]
    celdas = [sum(1 for p in props if p["tipo_ae"] == k) for k, _, _ in orden]
    edif = [sum(p["n_edif"] for p in props if p["tipo_ae"] == k) for k, _, _ in orden]
    fig, axs = plt.subplots(1, 2, figsize=(10, 4.6), gridspec_kw={"wspace": 0.95})
    fig.subplots_adjust(top=0.75, bottom=0.16, left=0.22, right=0.97)
    etiquetas = [o[1] for o in orden]
    colores = [o[2] for o in orden]
    barras_h(axs[0], etiquetas, celdas, colores, [fmt(v) for v in celdas], "Celdas de 250 m")
    barras_h(axs[1], etiquetas, edif, colores, [fmt(v) for v in edif], "Edificaciones")
    titular(
        fig,
        "Tipología preliminar A–E",
        f"C + D + E = {sum(celdas[2:])} celdas a priorizar para validación en campo",
        "Clasificación metodológica preliminar, sujeta a validación. Fuente: capa mdc_tipologias_ae (celdas de 250 m).",
    )
    fig.savefig(OUT / "figura_2_tipologia_ae.png", facecolor="white")
    plt.close(fig)


def figura_consolidacion(huella: list[dict]) -> None:
    por_anio: dict[int, float] = defaultdict(float)
    for f in huella:
        p = f["properties"]
        if p.get("anio_dw_nuevo") and p.get("ha_dw_nuevo"):
            por_anio[int(round(p["anio_dw_nuevo"]))] += p["ha_dw_nuevo"]
    anios = list(range(2018, 2026))
    vals = [por_anio.get(a, 0.0) for a in anios]
    total = sum(vals)
    fig, ax = plt.subplots(figsize=(10, 4.4))
    fig.subplots_adjust(top=0.74, bottom=0.17, left=0.08, right=0.97)
    colores = ["#fd8d3c" if a <= 2021 else "#bd0026" for a in anios]
    ax.bar([str(a) for a in anios], vals, color=colores, width=0.62, edgecolor="white", linewidth=1)
    ax.yaxis.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    ax.set_ylabel("ha de nueva huella construida")
    ax.tick_params(axis="x", length=0, colors=INK)
    for i, v in enumerate(vals):
        ax.text(i, v + max(vals) * 0.02, fmt(v), ha="center", fontsize=9)
    ax.set_ylim(0, max(vals) * 1.18)
    ax.text(1.5, max(vals) * 1.12, "Crecimiento 2018–2021", ha="center", fontsize=9, color="#b35806")
    ax.text(5.5, max(vals) * 1.12, "Crecimiento 2022–2025", ha="center", fontsize=9, color="#bd0026")
    titular(
        fig,
        "Nueva huella construida por año estimado de consolidación (Dynamic World)",
        f"≈ {fmt(total)} ha entre 2018 y 2025, sobre línea base 2017 calibrada en el centro histórico",
        "Preliminar. Cada celda se asigna a su año medio estimado de consolidación; los años recientes pueden ajustarse con nuevas observaciones.",
    )
    fig.savefig(OUT / "figura_3_consolidacion_anual_dw.png", facecolor="white")
    plt.close(fig)


def figura_sectores(brecha: list[dict]) -> None:
    from shapely.geometry import shape

    sectores = json.loads((CAPAS / "mdc_sectores.geojson").read_text(encoding="utf-8"))["features"]
    geoms = [(s["properties"]["NOM_SECTOR"].title(), s["properties"].get("TEG_COM", ""), shape(s["geometry"])) for s in sectores]
    agg: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])
    for f in brecha:
        p = f["properties"]
        if p["n_edif"] <= 0:
            continue
        pt = shape(f["geometry"]).representative_point()
        for nom, ciudad, g in geoms:
            if g.contains(pt):
                agg[nom][0] += p["n_edif"]
                agg[nom][1] += p["n_edif_fuera"]
                break
    top = sorted(agg.items(), key=lambda kv: kv[1][1], reverse=True)[:12]
    etiquetas = [k for k, _ in top]
    fuera = [v[1] for _, v in top]
    textos = [f"{fmt(v[1])} ({str(round(v[1] / v[0] * 100, 1)).replace('.', ',')} %)" for _, v in top]
    fig, ax = plt.subplots(figsize=(10, 5.4))
    fig.subplots_adjust(top=0.79, bottom=0.13, left=0.15, right=0.97)
    barras_h(ax, etiquetas, fuera, ["#ef3b2c"] * len(top), textos, "Edificaciones fuera de predio (y % del total del sector)")
    titular(
        fig,
        "Sectores catastrales con más edificaciones fuera de predio",
        "Los 12 sectores AMDC con mayor número absoluto; cada celda se asigna al sector que contiene su punto representativo",
        "Preliminar. Fuente: mdc_brecha_agregada × sectores catastrales AMDC. La ausencia de predio no prueba por sí misma informalidad.",
    )
    fig.savefig(OUT / "figura_4_brecha_por_sector.png", facecolor="white")
    plt.close(fig)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    brecha = cargar("mdc_brecha_agregada.geojson")
    figura_brecha(brecha)
    figura_tipologia(cargar("mdc_tipologias_ae.geojson"))
    figura_consolidacion(cargar("mdc_huella_multitemporal.geojson"))
    figura_sectores(brecha)
    print("Figuras generadas en", OUT)


if __name__ == "__main__":
    main()
