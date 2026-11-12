/**
 * BRECHA CATASTRAL Y ASENTAMIENTOS INFORMALES · DISTRITO CENTRAL (HONDURAS)
 * Clústers Copernicus Centroamérica – Fase II · Ficha N.° 8
 *
 * Versión para el Code Editor de Google Earth Engine (JavaScript), equivalente
 * al notebook notebooks/brecha_catastral_distrito_central.ipynb.
 *
 *   Lo catastrado  → planimetría AMDC (assets PRIVADOS: predios, manzanas, colonias, PU 2025)
 *   Lo construido  → GHSL 2020, Open Buildings v3 y Open Buildings 2.5D Temporal
 *   La brecha      → edificaciones y m² construidos fuera de predio catastrado
 *
 * Los predios se usan solo para el cálculo. Las salidas públicas son agregados
 * por celda de 250 m; la ocupación por lote se exporta como CSV sin geometría (uso interno).
 */

// ---------------------------------------------------------------------------
// 1. Parámetros
// ---------------------------------------------------------------------------
var PROYECTO = 'projects/proyecto-honduras-514315/assets/';
var CONFIG = {
  umbralManchaM2: 1000,       // m² construidos por celda GHSL de 1 ha
  areaMinManchaHa: 50,        // núcleos urbanos mínimos (ha)
  anioInicio: 2016,
  confianzaEdif: 0.70,        // Open Buildings v3
  umbralPresenciaOB: 0.50,    // Open Buildings 2.5D Temporal
  pendienteCritica: 30,       // % de pendiente
  densidadInformal: 40,       // edificaciones / ha
  areaMediaInformal: 80,      // m² por edificación
  umbralLadera: 0.30,
  umbralNuevo: 0.50,
  umbralFueraCatastro: 0.50,
  umbralLoteOcupado: 0.10,
  epsg: 'EPSG:32616',
  // Unidad de agregación pública. 'celda' (250 m) es la que mide la brecha: las manzanas
  // y colonias SON catastro, así que agregando por ellas la construcción fuera de catastro
  // queda oculta por definición. 'manzana' sirve para describir el tejido catastrado.
  unidad: 'celda',
  tamCelda: 250,
  exportarLotes: false,       // ocupación por lote (uso interno), aparte por su costo
  // Etapa 1: guarda en assets una imagen de 4 m con lo construido y lo catastrado (una vez).
  // Etapa 2: agrega esa imagen por celda o manzana (rápido). Cambiar a 2 cuando termine la 1.
  etapa: 1,
  carpetaDrive: 'Copernicus_BrechaCatastral'
};

var predios   = ee.FeatureCollection(PROYECTO + 'amdc_predios_2026');
var manzanas  = ee.FeatureCollection(PROYECTO + 'amdc_manzanas_2026');
var perimetro = ee.FeatureCollection(PROYECTO + 'amdc_pu_2026').geometry();
var muni = ee.FeatureCollection('WM/geoLab/geoBoundaries/600/ADM2')
  .filter(ee.Filter.eq('shapeGroup', 'HND'))
  .filter(ee.Filter.eq('shapeName', 'Distrito Central')).geometry();
var aoi = perimetro;   // ámbito de análisis: perímetro urbano oficial PU 2025

// ---------------------------------------------------------------------------
// 2. Lo construido
// ---------------------------------------------------------------------------
var ghsl = ee.Image(ee.ImageCollection('JRC/GHSL/P2023A/GHS_BUILT_S')
  .filterDate('2020-01-01', '2021-01-01').first()).select('built_surface').clip(muni);
var mancha = ghsl.gte(CONFIG.umbralManchaM2)
  .focalMax(1, 'square', 'pixels').focalMin(1, 'square', 'pixels').selfMask()
  .reduceToVectors({geometry: muni, scale: 100, crs: CONFIG.epsg, geometryType: 'polygon',
                    eightConnected: true, labelProperty: 'urbano', maxPixels: 1e10})
  .map(function (f) { return f.set('ha', f.geometry().area(10).divide(10000)); })
  .filter(ee.Filter.gte('ha', CONFIG.areaMinManchaHa))
  .geometry(10);

var edif = ee.FeatureCollection('GOOGLE/Research/open-buildings/v3/polygons')
  .filterBounds(aoi).filter(ee.Filter.gte('confidence', CONFIG.confianzaEdif));
var huella = ee.Image(0).byte().paint(edif, 1).rename('edif').clip(aoi);

var obt = ee.ImageCollection('GOOGLE/Research/open-buildings-temporal/v1').filterBounds(aoi);
var aparicion = ee.ImageCollection.fromImages(ee.List.sequence(2016, 2023).map(function (a) {
  a = ee.Number(a);
  var presente = obt.filter(ee.Filter.calendarRange(a, a, 'year')).mosaic()
    .select('building_presence').gte(CONFIG.umbralPresenciaOB);
  return ee.Image.constant(a).toInt16().updateMask(presente).rename('anio_edif');
})).min().clip(aoi);
var nuevo = aparicion.gte(CONFIG.anioInicio + 1).unmask(0).and(huella);

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').filterBounds(aoi).select('DEM');
dem = dem.mosaic().setDefaultProjection(dem.first().projection());
var critica = ee.Terrain.slope(dem).multiply(Math.PI / 180).tan().multiply(100)
  .gte(CONFIG.pendienteCritica).clip(aoi);

// Conteo de edificaciones: se pinta el píxel que contiene el centroide de cada edificación
// (más rápido que reduceToImage; a 4 m dos centroides casi nunca caen en el mismo píxel).
function centroides(fc) {
  return fc.map(function (f) { return ee.Feature(f.centroid(1)); });
}
var conteo = ee.Image(0).byte().paint(centroides(edif), 1);

// ---------------------------------------------------------------------------
// 3. Lo catastrado y la brecha
// ---------------------------------------------------------------------------
var prediosAoi = predios.filterBounds(aoi);
var catastrado = ee.Image(0).byte().paint(prediosAoi, 1);
var fuera = huella.and(catastrado.not());
var nLotes = ee.Image(0).byte().paint(centroides(prediosAoi), 1);

// Imagen base de 4 m (0/1 por banda). Pintar cientos de miles de polígonos en cada
// agregación excede el tiempo de Earth Engine; por eso se materializa una vez como asset.
var ASSET_BASE = PROYECTO + 'mdc_base_4m';
var base = huella.rename('edif')
  .addBands(nuevo.rename('nuevo'))
  .addBands(critica.rename('critica'))
  .addBands(conteo.rename('conteo'))
  .addBands(catastrado.rename('catastrado'))
  .addBands(nLotes.rename('lotes'))
  .toByte().clip(aoi);
var B = CONFIG.etapa === 2 ? ee.Image(ASSET_BASE) : base;

var area = ee.Image.pixelArea();
var pila = B.select('edif').multiply(area).rename('m2_edif')
  .addBands(B.select('nuevo').multiply(area).rename('m2_nuevo'))
  .addBands(B.select('edif').and(B.select('critica')).multiply(area).rename('m2_critico'))
  .addBands(B.select('conteo').rename('n_edif'))
  .addBands(B.select('catastrado').multiply(area).rename('m2_catastrado'))
  .addBands(B.select('edif').and(B.select('catastrado').not()).multiply(area).rename('m2_fuera'))
  .addBands(B.select('conteo').multiply(B.select('catastrado').not()).rename('n_edif_fuera'))
  .addBands(B.select('lotes').rename('n_lotes'))
  .addBands(B.select('edif').mask().multiply(area).rename('m2_valido'));

// Grupos de sectores catastrales: el cálculo se divide en lotes de ~1.500–2.000 manzanas
// para no exceder el tiempo máximo de Earth Engine. El último grupo recoge el resto.
var GRUPOS = [
  ['01', '02', '03', '04', '05', '06', '08', '10', '11', '14', '15'],
  ['07', '09'], ['13'], ['16', '17', '18', '22'], ['19', '20'],
  ['21', '24'], ['23', '26', '27'], ['25', '28']
];
var TODOS = [].concat.apply([], GRUPOS);
function filtroGrupo(i) {
  return i < GRUPOS.length ? ee.Filter.inList('SECTOR', GRUPOS[i]) : ee.Filter.inList('SECTOR', TODOS).not();
}
var N_GRUPOS = GRUPOS.length + 1;

// Retícula de 250 m, dividida en 6 franjas oeste–este para exportar. Las celdas se exportan
// completas (recortarlas aquí al perímetro multiplica el tiempo de cálculo); la superficie
// válida sale de los píxeles dentro del ámbito (m2_valido) y el recorte geométrico se hace
// al integrar la capa al geovisor (src/gee/unir_celdas.py). Coordenadas exportadas en UTM 16N.
var celdas = aoi.coveringGrid(ee.Projection(CONFIG.epsg).atScale(CONFIG.tamCelda))
  .map(function (f) {
    return f.set({unidad: f.id(), cx: f.geometry().centroid(1).coordinates().get(0)});
  });
var CORTES = [-87.30, -87.2577, -87.2268, -87.1959, -87.1650, -87.1341, -87.09];

function indicadores(unidades) {
  return pila.reduceRegions({collection: unidades, reducer: ee.Reducer.sum(),
                             scale: 4, crs: CONFIG.epsg, tileScale: 4}).map(tipificar);
}

function tipificar(f) {
  var ha = ee.Number(f.get('m2_valido')).divide(10000).max(0.0001);   // superficie dentro del ámbito
  var m2 = ee.Number(f.get('m2_edif'));
  var hay = m2.gt(0);
  var den = m2.max(1);
  var n = ee.Number(f.get('n_edif'));
  var pNuevo = ee.Number(f.get('m2_nuevo')).divide(den);
  var pCritico = ee.Number(f.get('m2_critico')).divide(den);
  var pFuera = ee.Number(f.get('m2_fuera')).divide(den);
  var densidad = n.divide(ha);
  var areaMedia = m2.divide(n.max(1));
  var morf = densidad.gte(CONFIG.densidadInformal).and(areaMedia.lte(CONFIG.areaMediaInformal));
  var brecha = pFuera.gte(CONFIG.umbralFueraCatastro);
  var tipo = ee.Algorithms.If(hay.not(), 'Sin edificación',
             ee.Algorithms.If(morf.and(pCritico.gte(CONFIG.umbralLadera)), 'Candidato informal en condición crítica',
             ee.Algorithms.If(morf.and(pNuevo.gte(CONFIG.umbralNuevo)), 'Candidato informal reciente',
             ee.Algorithms.If(morf, 'Candidato informal consolidado', 'Tejido no clasificado como informal'))));
  var tipoBrecha = ee.Algorithms.If(hay.not(), 'Sin edificación',
             ee.Algorithms.If(brecha.and(morf), 'Brecha catastral + morfología informal',
             ee.Algorithms.If(brecha, 'Brecha catastral',
             ee.Algorithms.If(morf, 'Morfología informal dentro de catastro', 'Construido dentro de catastro'))));
  return f.set({
    ha: ha, dens_edif_ha: densidad, area_media_m2: areaMedia,
    cobertura_edif: m2.divide(ha.multiply(10000)),
    p_nuevo: pNuevo, p_critico: pCritico, p_fuera_catastro: pFuera,
    cobertura_catastral: ee.Number(f.get('m2_catastrado')).divide(ha.multiply(10000)),
    morf_informal: morf, brecha_catastral: brecha,
    tipologia: tipo, tipologia_brecha: tipoBrecha
  });
}

// Ocupación por lote (USO INTERNO): m² construidos dentro de cada predio
function ocupacionLotes(lotes) {
  return B.select('edif').multiply(area).reduceRegions({
    collection: lotes, reducer: ee.Reducer.sum().setOutputs(['m2_edif']),
    scale: 2, crs: CONFIG.epsg, tileScale: 4
  }).map(function (f) {
    var p = ee.Number(f.get('m2_edif')).divide(f.geometry().area(1).max(1));
    return f.set({p_ocupado: p, ocupado: p.gte(CONFIG.umbralLoteOcupado)});
  });
}

// ---------------------------------------------------------------------------
// 4. Mapa
// ---------------------------------------------------------------------------
Map.centerObject(aoi, 12);
Map.addLayer(ee.Image().byte().paint(ee.FeatureCollection([ee.Feature(mancha)]), 1, 2), {palette: ['FF7F00']}, 'Mancha GHSL 2020');
Map.addLayer(ee.Image().byte().paint(ee.FeatureCollection([ee.Feature(perimetro)]), 1, 2), {palette: ['14283F']}, 'Perímetro urbano PU 2025');
Map.addLayer(catastrado.selfMask(), {palette: ['a6cee3'], opacity: 0.4}, 'Superficie catastrada', false);
Map.addLayer(huella.selfMask(), {palette: ['444444']}, 'Edificaciones (Open Buildings v3)', false);
Map.addLayer(fuera.selfMask(), {palette: ['e31a1c']}, 'Edificación fuera de predio catastrado');

// ---------------------------------------------------------------------------
// 5. Exportaciones (pestaña Tasks → Run)
// ---------------------------------------------------------------------------
var CAMPOS_PUBLICOS = ['unidad', 'SECTOR', 'MANZANA', 'ha', 'n_edif', 'n_edif_fuera', 'n_lotes', 'm2_edif', 'm2_fuera',
  'dens_edif_ha', 'area_media_m2', 'cobertura_edif', 'p_nuevo', 'p_critico', 'cobertura_catastral',
  'p_fuera_catastro', 'brecha_catastral', 'tipologia', 'tipologia_brecha', 'm2_valido'];

if (CONFIG.etapa === 1) {
  Export.image.toAsset({
    image: base, description: 'MDC_base_4m', assetId: ASSET_BASE,
    region: aoi, scale: 4, crs: CONFIG.epsg, maxPixels: 1e11,
    pyramidingPolicy: {'.default': 'sample'}});
  Export.table.toDrive({
    collection: ee.FeatureCollection([ee.Feature(mancha, {nombre: 'Mancha urbana consolidada GHSL 2020',
                                                          umbral_m2_ha: CONFIG.umbralManchaM2})]),
    description: 'MDC_mancha_urbana_ghsl', folder: CONFIG.carpetaDrive, fileFormat: 'GeoJSON'});
}

// Brecha agregada: una exportación por franja (celdas) o por grupo de sectores (manzanas);
// se unen después en el geovisor.
if (CONFIG.etapa === 2 && CONFIG.unidad === 'celda') {
  for (var k = 0; k < CORTES.length - 1; k++) {
    Export.table.toDrive({
      collection: indicadores(celdas.filter(ee.Filter.rangeContains('cx', CORTES[k], CORTES[k + 1])))
        .filter(ee.Filter.gt('m2_valido', 100)).select(CAMPOS_PUBLICOS),
      description: 'MDC_brecha_celda250_s' + (k + 1), folder: CONFIG.carpetaDrive, fileFormat: 'GeoJSON'});
  }
} else if (CONFIG.etapa === 2) {
  for (var i = 0; i < N_GRUPOS; i++) {
    Export.table.toDrive({
      collection: indicadores(manzanas.filterBounds(aoi).filter(filtroGrupo(i))).select(CAMPOS_PUBLICOS),
      description: 'MDC_brecha_manzana_g' + (i + 1), folder: CONFIG.carpetaDrive, fileFormat: 'GeoJSON'});
  }
}

// Ocupación por lote (uso interno), por grupo de sectores
for (var j = 0; CONFIG.etapa === 2 && CONFIG.exportarLotes && j < N_GRUPOS; j++) {
  var g = 'g' + (j + 1);
  Export.table.toDrive({
    collection: ocupacionLotes(prediosAoi.filter(filtroGrupo(j))),
    description: 'MDC_ocupacion_lotes_USO_INTERNO_' + g, folder: CONFIG.carpetaDrive, fileFormat: 'CSV',
    selectors: ['CLAVE_CAT', 'SECTOR', 'MANZANA', 'LOTE', 'COD_COL', 'm2_edif', 'p_ocupado', 'ocupado']});
}
