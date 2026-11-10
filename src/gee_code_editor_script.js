/**
 * ============================================================================
 * PROYECTO GEE: Prueba 2-Distrito Central
 * USUARIO / CLOUD PROJECT: ee-mariomr16
 * Iniciativa: Brecha catastral y asentamientos informales en el MDC
 * Ecosistema: Comunidad Urbana Copernicus Centroamérica
 * ============================================================================
 * 
 * INSTRUCCIONES DE USO EN GEE CODE EDITOR:
 * 1. Ingresa a: https://code.earthengine.google.com/?project=ee-mariomr16
 * 2. Copia y pega este script en el editor central.
 * 3. Presiona "Run" para visualizar las capas de análisis territorial.
 */

// 1. ÁREA DE ESTUDIO (AOI): Mancha urbana consolidada del Distrito Central
var aoiMDC = ee.Geometry.Polygon([
  [[-87.275, 14.020],
   [-87.135, 14.020],
   [-87.135, 14.165],
   [-87.275, 14.165],
   [-87.275, 14.020]]
]);

Map.centerObject(aoiMDC, 12);
Map.setOptions('SATELLITE');

// 2. COPERNICUS DEM GLO-30: Topografía y laderas críticas (>= 30%)
var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30')
  .select('DEM')
  .mosaic()
  .clip(aoiMDC);

var slopeDeg = ee.Terrain.slope(dem);
var slopePct = slopeDeg.divide(180).multiply(Math.PI).tan().multiply(100);
var laderasCriticas = slopePct.gte(30).selfMask();

// 3. SENTINEL-2 L2A: Compuesto óptico época seca y cálculo de índices espectrales
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoiMDC)
  .filterDate('2025-01-01', '2026-03-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .median()
  .clip(aoiMDC);

// NDBI = (B11 - B8) / (B11 + B8)
var ndbi = s2.normalizedDifference(['B11', 'B8']).rename('NDBI');
// NDVI = (B8 - B4) / (B8 + B4)
var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');

// 4. DYNAMIC WORLD: Probabilidad de superficie construida
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterBounds(aoiMDC)
  .filterDate('2025-01-01', '2026-03-31')
  .select('built')
  .mean()
  .clip(aoiMDC);

// 5. MÁSCARAS OPERATIVAS
// Huella construida observada
var huellaConstruida = ndbi.gt(0.1).and(dw.gte(0.5)).selfMask();

// Asentamientos informales candidatos en ladera crítica (Riesgo por pendiente >= 30%)
var asentamientosEnRiesgo = huellaConstruida.and(laderasCriticas).selfMask();

// 6. VISUALIZACIÓN EN MAPA
Map.addLayer(dem, {min: 900, max: 1600, palette: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921']}, 'Copernicus DEM (Elevación)', false);
Map.addLayer(slopePct, {min: 0, max: 45, palette: ['#10b981', '#f59e0b', '#ef4444']}, 'Pendiente del Terreno (%)', false);
Map.addLayer(laderasCriticas, {palette: ['#dc2626']}, 'Zonas Críticas (Pendiente >= 30%)', false);

Map.addLayer(s2, {bands: ['B4', 'B3', 'B2'], min: 300, max: 2500}, 'Sentinel-2 (Color Real RGB)', false);
Map.addLayer(ndbi, {min: -0.3, max: 0.5, palette: ['#1e3a8a', '#94a3b8', '#f59e0b', '#b91c1c']}, 'Índice NDBI (Construido)', false);
Map.addLayer(dw, {min: 0, max: 1, palette: ['#0f172a', '#38bdf8', '#fbbf24', '#f97316']}, 'Dynamic World (P. Built)', false);

Map.addLayer(huellaConstruida, {palette: ['#fbbf24']}, 'Ciudad Construida Observada (2026)', true);
Map.addLayer(asentamientosEnRiesgo, {palette: ['#ef4444']}, 'Asentamientos Candidatos en Ladera Crítica', true);

// 7. PANEL DE CONTROL FORENSE
var panel = ui.Panel({
  style: {
    position: 'top-left',
    padding: '10px 14px',
    backgroundColor: 'rgba(5, 5, 8, 0.92)'
  }
});

var title = ui.Label({
  value: 'FORENSIC URBAN LAB // MDC',
  style: {fontWeight: 'bold', fontSize: '13px', color: '#FFC800', backgroundColor: 'transparent'}
});
var desc = ui.Label({
  value: 'Proyecto: Prueba 2-Distrito Central (ee-mariomr16)\nAnálisis de brecha construida vs. catastro',
  style: {fontSize: '11px', color: '#CBD5E1', backgroundColor: 'transparent', whiteSpace: 'pre'}
});

panel.add(title);
panel.add(desc);
Map.add(panel);

print('Inicialización exitosa para ee-mariomr16 en Distrito Central.');
