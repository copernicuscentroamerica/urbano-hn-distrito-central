/**
 * CIUDAD CONSTRUIDA Y AÑO DE APARICIÓN · DISTRITO CENTRAL (HONDURAS)
 * Clústers Copernicus Centroamérica – Fase II · Ficha N.° 8
 *
 * Agrega por celdas de 250 m dos fuentes independientes de temporalidad:
 *   1. Open Buildings 2.5D Temporal (Google, 4 m): año en que aparece cada edificación (2016–2023),
 *      restringido a las huellas de Open Buildings v3 de la imagen base mdc_base_4m.
 *   2. Dynamic World (Sentinel-2, 10 m): año en que el píxel pasa a "construido" de forma estable
 *      (construido en la estación seca de ese año y del siguiente), 2016–2025.
 * Compararlas permite validar la "ocupación reciente" del tipo D de la tipología A–E.
 *
 * Requiere el asset mdc_base_4m (etapa 1 de brecha_catastral_mdc.js). Las celdas se exportan
 * completas en UTM 16N; se recortan al perímetro al integrarlas al geovisor.
 */

var PROYECTO = 'projects/proyecto-honduras-514315/assets/';
var CONFIG = {
  umbralPresenciaOB: 0.50,     // building_presence de Open Buildings 2.5D Temporal
  anioBase: 2016,
  aniosOB: [2016, 2023],
  aniosDW: [2016, 2025],       // años de consolidación evaluados (cada uno exige el año siguiente)
  mesesSecos: [1, 4],          // enero–abril
  epsg: 'EPSG:32616',
  tamCelda: 250,
  escala: 5,
  carpetaDrive: 'Copernicus_BrechaCatastral'
};

var perimetro = ee.FeatureCollection(PROYECTO + 'amdc_pu_2026').geometry();
var base = ee.Image(PROYECTO + 'mdc_base_4m');
var edif = base.select('edif');
var valido = edif.mask();                        // 1 dentro del perímetro urbano
var area = ee.Image.pixelArea();

// 1. Open Buildings 2.5D Temporal: año de aparición
var obt = ee.ImageCollection('GOOGLE/Research/open-buildings-temporal/v1').filterBounds(perimetro);
var aparicion = ee.ImageCollection.fromImages(
  ee.List.sequence(CONFIG.aniosOB[0], CONFIG.aniosOB[1]).map(function (a) {
    a = ee.Number(a);
    var presente = obt.filter(ee.Filter.calendarRange(a, a, 'year')).mosaic()
      .select('building_presence').gte(CONFIG.umbralPresenciaOB);
    return ee.Image.constant(a).toInt16().updateMask(presente).rename('anio');
  })).min();
var conAnio = aparicion.mask().and(edif);
var anioOB = aparicion.unmask(0);

// 2. Dynamic World: año de consolidación urbana
function construido(a) {
  a = ee.Number(a);
  var ini = ee.Date.fromYMD(a, CONFIG.mesesSecos[0], 1);
  var fin = ee.Date.fromYMD(a, CONFIG.mesesSecos[1], 1).advance(1, 'month');
  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(perimetro).filterDate(ini, fin)
    .select('label').mode().eq(6);
}
var consolidacion = ee.ImageCollection.fromImages(
  ee.List.sequence(CONFIG.aniosDW[0], CONFIG.aniosDW[1]).map(function (a) {
    a = ee.Number(a);
    var estable = construido(a).and(construido(a.add(1)));
    return ee.Image.constant(a).toInt16().updateMask(estable).rename('anio');
  })).min();
var dwUrb = consolidacion.mask();
var anioDW = consolidacion.unmask(0);

// 3. Pila de m² por celda, año por año (todo restringido al perímetro). La línea base se
//    calibra después (src/gee/temporalidad_celdas.py): 2016 tiene menos escenas Sentinel-2
//    (solo S2A) y ambas fuentes subdetectan lo ya construido ese año.
var bandas = [
  edif.multiply(area).rename('m2_edif'),
  edif.and(conAnio.not()).multiply(area).rename('ob_m2_sin_anio'),
  dwUrb.multiply(area).rename('dw_m2_urbano'),
  valido.multiply(area).rename('m2_valido')
];
for (var y = CONFIG.aniosOB[0]; y <= CONFIG.aniosOB[1]; y++) {
  bandas.push(conAnio.and(anioOB.eq(y)).multiply(area).rename('ob_m2_' + y));
}
for (var z = CONFIG.aniosDW[0]; z <= CONFIG.aniosDW[1]; z++) {
  bandas.push(dwUrb.and(anioDW.eq(z)).multiply(area).rename('dw_m2_' + z));
}
var pila = ee.Image.cat(bandas).updateMask(valido);

var celdas = perimetro.coveringGrid(ee.Projection(CONFIG.epsg).atScale(CONFIG.tamCelda))
  .map(function (f) {
    return f.set({unidad: f.id(), cx: f.geometry().centroid(1).coordinates().get(0)});
  });

// 4. Mapa de control
Map.centerObject(perimetro, 12);
var pal = ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#7f2704'];
Map.addLayer(aparicion.updateMask(edif), {min: 2016, max: 2023, palette: pal}, 'Año de aparición (OB 2.5D)');
Map.addLayer(consolidacion.clip(perimetro), {min: 2016, max: 2025, palette: pal}, 'Año de consolidación (Dynamic World)', false);

// 5. Exportación por franjas oeste–este
var CORTES = [-87.30, -87.2577, -87.2268, -87.1959, -87.1650, -87.1341, -87.09];
for (var k = 0; k < CORTES.length - 1; k++) {
  Export.table.toDrive({
    collection: pila.reduceRegions({
      collection: celdas.filter(ee.Filter.rangeContains('cx', CORTES[k], CORTES[k + 1])),
      reducer: ee.Reducer.sum(), scale: CONFIG.escala, crs: CONFIG.epsg, tileScale: 4
    }).filter(ee.Filter.gt('m2_valido', 100)),
    description: 'MDC_temporalidad_anual_celda250_s' + (k + 1), folder: CONFIG.carpetaDrive, fileFormat: 'GeoJSON'
  });
}
