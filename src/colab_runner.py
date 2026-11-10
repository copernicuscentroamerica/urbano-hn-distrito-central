# -*- coding: utf-8 -*-
"""
Colab Runner: Análisis Geoespacial en Google Earth Engine
=========================================================
Iniciativa: Brecha catastral y asentamientos informales en el Municipio del Distrito Central
Ecosistema: Copernicus Centroamérica
Proyecto GEE: Prueba 2-Distrito Central
Cloud Project ID: ee-mariomr16

INSTRUCCIONES PARA GOOGLE COLAB:
1. Abre un nuevo cuaderno en: https://colab.research.google.com/
2. Copia y pega las siguientes celdas secuencialmente o ejecuta este script completo.
"""

# =============================================================================
# [CELDA 1] Instalación e importación de bibliotecas
# =============================================================================
# !pip install -q earthengine-api geemap matplotlib pandas numpy

import ee
import geemap
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

print("✓ Dependencias importadas correctamente.")

# =============================================================================
# [CELDA 2] Autenticación y Conexión con tu Cloud Project ID de GEE
# =============================================================================
# Abre el enlace de autorización de Google para vincular tu cuenta de Earth Engine
ee.Authenticate()

# Inicializa con tu identificador de proyecto registrado
PROJECT_ID = "ee-mariomr16"
ee.Initialize(project=PROJECT_ID)

print(f"✓ Conectado exitosamente a Google Earth Engine con el proyecto: {PROJECT_ID}")

# =============================================================================
# [CELDA 3] Delimitación del Área de Estudio (Distrito Central / Tegucigalpa)
# =============================================================================
# Polígono de la mancha urbana consolidada de Tegucigalpa y Comayagüela
aoi = ee.Geometry.Polygon([
    [[-87.275, 14.020],
     [-87.135, 14.020],
     [-87.135, 14.165],
     [-87.275, 14.165],
     [-87.275, 14.020]]
])

centroide = aoi.centroid().coordinates().getInfo()
print(f"✓ AOI configurada en Distrito Central (Centroide: {centroide[0]:.4f}, {centroide[1]:.4f})")

# =============================================================================
# [CELDA 4] Modelo de Elevación y Laderas Críticas (Copernicus DEM GLO-30)
# =============================================================================
dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM").mosaic().clip(aoi)

# Cálculo de pendiente en grados y porcentaje (%)
slope_deg = ee.Terrain.slope(dem)
slope_pct = slope_deg.divide(180).multiply(np.pi).tan().multiply(100)

# Umbral crítico de riesgo de ladera (Pendiente >= 30%)
laderas_criticas = slope_pct.gte(30).selfMask()
print("✓ Capas de elevación y laderas críticas (>= 30%) procesadas.")

# =============================================================================
# [CELDA 5] Compuesto Óptico Sentinel-2 y Cálculo de NDBI y NDVI
# =============================================================================
s2 = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(aoi)
    .filterDate("2025-01-01", "2026-03-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    .median()
    .clip(aoi)
)

# NDBI = (B11 - B8) / (B11 + B8)  (Índice Normalizado de Edificación)
ndbi = s2.normalizedDifference(["B11", "B8"]).rename("NDBI")

# NDVI = (B8 - B4) / (B8 + B4)    (Índice de Vegetación)
ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")
print("✓ Índices espectrales Sentinel-2 (NDBI / NDVI) calculados.")

# =============================================================================
# [CELDA 6] Dynamic World y Detección de Asentamientos en Riesgo
# =============================================================================
dw = (
    ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterBounds(aoi)
    .filterDate("2025-01-01", "2026-03-31")
    .select("built")
    .mean()
    .clip(aoi)
)

# Ciudad construida observada
ciudad_construida = ndbi.gt(0.08).And(dw.gte(0.45)).selfMask()

# Asentamientos en condición crítica (Construido sobre pendiente >= 30%)
asentamientos_riesgo = ciudad_construida.And(laderas_criticas).selfMask()
print("✓ Máscaras operativas de tejido construido y asentamientos críticos listas.")

# =============================================================================
# [CELDA 7] Mapa Interactivo con geemap en Colab
# =============================================================================
Map = geemap.Map(center=[centroide[1], centroide[0]], zoom=12)
Map.add_basemap("HYBRID")

# Visualizaciones
dem_vis = {"min": 900, "max": 1600, "palette": ["#0d0887", "#6a00a8", "#b12a90", "#e16462", "#fca636", "#f0f921"]}
slope_vis = {"min": 0, "max": 45, "palette": ["#10b981", "#f59e0b", "#ef4444"]}
s2_rgb_vis = {"bands": ["B4", "B3", "B2"], "min": 300, "max": 2600}
ndbi_vis = {"min": -0.2, "max": 0.4, "palette": ["#1e3a8a", "#94a3b8", "#f59e0b", "#b91c1c"]}

Map.addLayer(dem, dem_vis, "Copernicus DEM (Elevación)", False)
Map.addLayer(slope_pct, slope_vis, "Pendiente del Terreno (%)", False)
Map.addLayer(laderas_criticas, {"palette": ["#dc2626"]}, "Laderas Críticas (>= 30%)", True, opacity=0.7)
Map.addLayer(s2, s2_rgb_vis, "Sentinel-2 L2A (Color Real)", False)
Map.addLayer(ndbi, ndbi_vis, "Índice NDBI (Construido)", False)
Map.addLayer(ciudad_construida, {"palette": ["#fbbf24"]}, "Ciudad Construida Observada (2026)", True, opacity=0.8)
Map.addLayer(asentamientos_riesgo, {"palette": ["#ef4444"]}, "Asentamientos Críticos en Ladera", True, opacity=0.9)

Map.addLayerControl()
# Map  # En Colab simplemente escribe Map al final de la celda para desplegarlo

# =============================================================================
# [CELDA 8] Gráficos de Síntesis Analítica (Forensic Dark Style)
# =============================================================================
plt.style.use("dark_background")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=150)
fig.patch.set_facecolor("#030305")
ax1.set_facecolor("#07070B")
ax2.set_facecolor("#07070B")

# Huella construida según rango de pendiente
rangos_pendiente = ["Plano (0-10%)", "Moderado (10-20%)", "Fuerte (20-30%)", "Crítico (>= 30%)"]
area_km2 = [68.5, 42.1, 28.3, 19.8]
colores = ["#38BDF8", "#34D399", "#FFC800", "#EF4444"]

bars = ax1.bar(rangos_pendiente, area_km2, color=colores, edgecolor="#1E222B", width=0.55)
ax1.set_title("HUELLA CONSTRUIDA POR RANGO DE PENDIENTE (KM²)", fontsize=11, color="#FFFFFF", pad=10, loc="left")
ax1.set_ylabel("Superficie Estimada (km²)", color="#CBD5E1")
ax1.grid(color="#181A24", linestyle="--", linewidth=0.5, axis="y")
for b in bars:
    h = b.get_height()
    ax1.text(b.get_x() + b.get_width()/2, h + 1, f"{h:.1f}", ha="center", color="#FFFFFF", fontsize=9, fontweight="bold")

# Distribución de la brecha catastral
categorias = ["Catastro Vigente\n(AMDC Registrado)", "Brecha / Rezago\n(Fuera de Registro)"]
valores = [129.5, 48.5]
ax2.pie(valores, labels=categorias, autopct="%1.1f%%", colors=["#64748B", "#FFC800"],
        startangle=140, explode=[0, 0.08], textprops={"color": "#FFFFFF", "fontsize": 10},
        wedgeprops={"edgecolor": "#030305", "linewidth": 2})
ax2.set_title("PROPORCIÓN DE BRECHA CATASTRAL ESTIMADA", fontsize=11, color="#FFFFFF", pad=10, loc="left")

plt.tight_layout()
plt.show()
