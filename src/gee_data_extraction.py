#!/usr/bin/env python3
"""
gee_data_extraction.py
----------------------
Script de extracción y procesamiento en Google Earth Engine (Python API)
Iniciativa: Brecha catastral y asentamientos informales en el MDC
Usuario / Proyecto Cloud: ee-mariomr16
Proyecto: Prueba 2-Distrito Central
"""

import sys

def run_extraction():
    try:
        import ee
    except ImportError:
        print("[ERROR] earthengine-api no está instalado.")
        print("Instálalo ejecutando: pip install earthengine-api")
        return

    # 1. Inicialización con el ID de proyecto proporcionado
    PROJECT_ID = "ee-mariomr16"
    try:
        ee.Initialize(project=PROJECT_ID)
        print(f"[OK] Conectado exitosamente a Google Earth Engine bajo el proyecto: {PROJECT_ID}")
    except Exception as e:
        print(f"[ERROR] No se pudo inicializar GEE con el proyecto '{PROJECT_ID}': {e}")
        print("Asegúrate de haber iniciado sesión con: earthengine authenticate --auth_mode=notebook")
        return

    # 2. Definición del área de estudio: Municipio del Distrito Central (Tegucigalpa y Comayagüela)
    # Bounding box preliminar de la mancha urbana consolidada
    aoi_mdc = ee.Geometry.Polygon([
        [[-87.275, 14.020],
         [-87.135, 14.020],
         [-87.135, 14.165],
         [-87.275, 14.165],
         [-87.275, 14.020]]
    ])

    print("[+] Área de estudio delimitada (Mancha urbana MDC: -87.275 a -87.135 Lon, 14.020 a 14.165 Lat)")

    # 3. Insumo A: Copernicus DEM GLO-30 y cálculo de pendientes críticas (>= 30%)
    print("[+] Procesando Copernicus DEM GLO-30...")
    dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM").mosaic().clip(aoi_mdc)
    slope_deg = ee.Terrain.slope(dem)
    slope_pct = slope_deg.divide(180).multiply(3.141592).tan().multiply(100)
    laderas_criticas = slope_pct.gte(30).rename("ladera_critica_30pct")

    # 4. Insumo B: Sentinel-2 SR Harmonized (Composite época seca 2024–2026)
    print("[+] Procesando compuesto óptico Sentinel-2 y cálculo de índices espectrales...")
    s2 = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi_mdc)
        .filterDate("2025-01-01", "2026-03-31")
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        .median()
        .clip(aoi_mdc)
    )

    # Cálculo de NDBI = (SWIR - NIR) / (SWIR + NIR) -> (B11 - B8) / (B11 + B8)
    ndbi = s2.normalizedDifference(["B11", "B8"]).rename("NDBI")

    # Cálculo de NDVI = (NIR - RED) / (NIR + RED) -> (B8 - B4) / (B8 + B4)
    ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")

    # 5. Insumo C: Dynamic World (Probabilidad de superficie construida 'built')
    print("[+] Extrayendo probabilidad de huella construida con Dynamic World...")
    dw = (
        ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
        .filterBounds(aoi_mdc)
        .filterDate("2025-01-01", "2026-03-31")
        .select("built")
        .mean()
        .clip(aoi_mdc)
        .rename("dw_built_prob")
    )

    # 6. Máscara de ciudad construida observada (NDBI > 0.1 y DW built prob >= 0.5)
    ciudad_construida = ndbi.gt(0.1).And(dw.gte(0.5)).rename("ciudad_construida_observada")

    # 7. Asentamientos candidatos en condición crítica (Construido observado + Ladera crítica >= 30%)
    asentamientos_criticos = ciudad_construida.And(laderas_criticas).rename("asentamiento_critico_ladera")

    # Estadísticas zonales agregadas en el MDC
    stats = asentamientos_criticos.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi_mdc,
        scale=30,
        maxPixels=1e9
    )

    print("\n[OK] Extracción de parámetros completada exitosamente.")
    print("     Capas procesadas: DEM, Pendientes (>=30%), NDBI, NDVI, Dynamic World Built y Asentamientos Críticos.")
    print("     Para visualizar las capas en la consola de GEE o exportar a GeoTIFF/Asset:")
    print("     projects/ee-mariomr16/assets/mdc_brecha_catastral_2026")

if __name__ == "__main__":
    run_extraction()
