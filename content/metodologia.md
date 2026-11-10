## Alcance técnico y metodológico declarado en el perfil

Los siguientes campos reproducen la información declarada por el equipo en el documento principal del perfil (identificado en el inventario documental como `S24`; consulta la lista completa de archivos al final de esta página). Representan la formulación técnica del perfil y se actualizan conforme avanza la validación del proyecto.

### Territorio y escala

**Ciudad, sector o territorio.** Mancha urbana consolidada del Municipio del Distrito Central (Tegucigalpa y Comayagüela), departamento de Francisco Morazán. El método se diseña para replicarse en otros municipios de Honduras.

**Escala principal de análisis.** Ciudad (mancha urbana consolidada), con resultados a escala de colonia y de edificación. El método es replicable a escala nacional.

**Superficie aproximada.** Por calcular con el polígono definitivo de la mancha urbana consolidada. El polígono preliminar del formulario (716,1 ha, centro histórico) queda solo como referencia.

**Centroide (lat, lon).** Por calcular con el polígono definitivo. Referencia preliminar (centro histórico): 14.10253, -87.20542.

**¿Cuenta con archivos geoespaciales?.** Sí. La AMDC aporta el parcelario y las capas municipales por medio de su representante en el equipo (Jonathan Ramírez, Analista en Planificación Urbana).

**Archivo cargado.** Pendiente: perímetro urbano delimitado, límite municipal oficial, parcelario catastral, capa de colonias y barrios y zonas de riesgo.

**Descripción de los archivos.** Perímetro urbano delimitado por la AMDC; parcelario con clave catastral, uso, estado (construido o baldío) y fecha de última actualización; colonias con su estatus legal; zonificación vigente; zonas de amenaza.

### Instrumentos y productos

**Instrumento de planificación o gestión al que aportaría.** Catastro municipal: priorización de la actualización catastral y del levantamiento en campo

Programas de regularización de la tenencia (AMDC – Instituto de la Propiedad)

Plan parcial / plan de mejoramiento integral de barrios

Plan de ordenamiento territorial / plan de desarrollo urbano

Reglamento o plan de zonificación / uso del suelo

Plan de gestión de riesgo

Plan de inversión municipal / presupuesto (incluida la base del impuesto de bienes inmuebles)

Atlas Municipal del MDC y Atlas Urbano UNAH, como instrumentos de información territorial

**Tipo de producto o entregable.** Mapa

Capa geoespacial

Indicador urbano

Tablero (dashboard) de indicadores

Script reproducible

Flujo de trabajo / metodología

Visor web

Base de datos

Insumo técnico para instrumento de planificación

Repositorio de datos o código

**Descripción del producto.** Un kit replicable de brecha catastral con cinco componentes:

Capas: huella construida multitemporal, edificaciones con año de aparición, edificaciones fuera de catastro, predios baldíos ocupados y asentamientos informales candidatos con tipología A–E (ver figura 1).

Mapas temáticos para el Atlas Municipal del MDC y el Atlas Urbano UNAH.

Tablero de indicadores por colonia y por municipio.

Scripts parametrizados por municipio en Google Earth Engine y en openEO, sobre Copernicus Data Space Ecosystem.

Guía metodológica y modelo de datos común para publicar los mismos productos en ambos atlas y replicarlos en otros municipios.

**Avance mínimo esperado en la jornada presencial.** Al cierre de la jornada:

Script de Google Earth Engine corriendo para la mancha urbana consolidada del MDC, con su polígono preliminar, huella construida 2016–2026, año de consolidación y edificaciones con año de aparición.

Primer mapa de edificaciones fuera de catastro en la mancha urbana consolidada.

Capa de indicadores por colonia o por celda de 250 m, exportada en GeoJSON y lista para el Atlas.

Prueba de replicabilidad: el mismo script ejecutado en un segundo municipio cambiando solo su nombre (por ejemplo, Juticalpa o San Pedro Sula).

### Datos

**Datos satelitales o productos geoespaciales útiles.** Sentinel-2 / óptico multiespectral (composites de estación seca, índices)

Sentinel-1 / radar SAR (construido bajo nubosidad)

Cobertura del suelo global (Dynamic World, ESA WorldCover)

GHSL / huella urbana global (historia 1975–2020)

Huellas de edificaciones (Google Open Buildings v3 y 2.5D Temporal; Microsoft)

Copernicus DEM / elevación (pendientes)

Imágenes de muy alta resolución / ortofotos (validación)

Drones / RPAS (validación en sectores de muestreo)

OpenStreetMap (vías y accesibilidad)

Población (censo INE, WorldPop)

Catastro / parcelario

Límites institucionales o administrativos

Datos de campo / encuestas (Kobo/ODK)

**Datos locales, institucionales o de campo disponibles.** AMDC: parcelario catastral, colonias y barrios, zonificación, zonas de riesgo, hidrografía, aldeas y caseríos.

Instituto de la Propiedad: predios titulados y polígonos en proceso de regularización (por gestionar).

TECHO Honduras: censo de asentamientos informales del casco urbano (2018), útil como referencia de validación.

INE: censo de población y vivienda por segmento censal.

**Datos que hacen falta.** Formalización de las condiciones de acceso al parcelario catastral digital con fecha de actualización por predio (acuerdo de uso de datos con la AMDC).

Inventario oficial actualizado de asentamientos y colonias no legalizadas; el registro municipal de nuevas ocupaciones se interrumpió.

Perímetro urbano delimitado oficial, límite municipal y límites de colonias homologados.

Zonas de riesgo en áreas no catastradas, incluidas las que están dentro del perímetro urbano delimitado.

Muestras de verificación en campo para calibrar umbrales y medir la exactitud.

**Enlaces relacionados.** Atlas Municipal del Distrito Central

TECHO Honduras: Censo de asentamientos informales, casco urbano del DC (2018)

Google Open Buildings 2.5D Temporal en Earth Engine

openEO en Copernicus Data Space Ecosystem

### Método y herramientas

**Métodos o pasos previstos.** Detección de cambios / expansión urbana entre fechas

Clasificación de coberturas y usos urbanos

Extracción de edificaciones (huellas existentes; segmentación en sectores de muestreo)

Cálculo de índices (NDBI, NDVI, BSI)

Cruce espacial entre ciudad construida y parcelario catastral (brecha catastral)

Métricas de morfología urbana para caracterizar el tejido informal

Análisis de exposición en laderas y zonas de riesgo

Fotogrametría con drones (validación en sectores de muestreo)

Mapeo participativo / encuestas

Validación con datos de campo

Visualización en dashboard, visor o app

**Flujo de trabajo preliminar.** 1. Ciudad construida (Nivel 1, datos globales). Huella construida anual 2016–2026 con Dynamic World y Sentinel-2; historia 1975–2020 con GHSL; edificaciones con Open Buildings v3 y año de aparición con Open Buildings 2.5D Temporal.

2. Ciudad catastrada (Nivel 2, datos de la AMDC). Normalización del parcelario al modelo de datos común: clave, uso, estado y fecha de actualización.

3. Cruce y brecha. Asignación de cada edificación a un predio y cálculo, por colonia, de edificaciones sin predio, baldíos ocupados, ocupación nueva y rezago catastral.

4. Caracterización y tipología. Combinación de brecha, morfología (densidad y tamaño de edificaciones) y condición crítica (pendiente ≥ 30 % o zona de riesgo) en la tipología A–E.

5. Validación. Muestreo estratificado por tipología en sectores de la mancha urbana, con ortofotos, dron y visitas; contraste con el censo TECHO 2018; ajuste de umbrales.

6. Publicación y réplica. Capas y tablero en el Atlas Municipal y el Atlas Urbano UNAH; scripts y guía en un repositorio abierto; réplica en un segundo municipio.

**Precisiones metodológicas para el cruce espacial.** Se establecen los siguientes criterios técnicos para asegurar la robustez del análisis entre la ciudad construida y el parcelario:

- *Tolerancia posicional:* Se define un búfer de tolerancia de 3 a 5 metros alrededor del centroide de cada edificación para absorber desplazamientos cartográficos menores entre las imágenes satelitales (Open Buildings / Sentinel) y el parcelario vectorial de la AMDC.
- *Diferenciación de vacíos:* Se distingue explícitamente entre edificaciones localizadas en sectores sin cobertura catastral digital (vacío de información) y edificaciones ubicadas dentro de predios catastrados pero no registradas (rezago o brecha catastral efectiva).
- *Filtrado multitemporal:* Para mitigar falsos positivos producidos por suelos desnudos estacionales o variabilidad fenológica, la huella construida se valida contra la serie temporal Sentinel-2 y el índice de persistencia de Dynamic World.

**Índices, algoritmos o herramientas.** NDBI, NDVI, BSI; probabilidad de construido (Dynamic World); presencia y altura de edificaciones (Open Buildings 2.5D); pendiente (Copernicus DEM); densidad de edificaciones por hectárea, tamaño medio de edificación y proporción fuera de catastro.

Herramientas: Google Earth Engine (JavaScript), openEO en Copernicus Data Space Ecosystem (Python), QGIS / ArcGIS Pro, PostGIS y GeoServer.

### Operación y acompañamiento

**Frecuencia de actualización o análisis.** Trimestral: alertas de nuevas ocupaciones (Sentinel-2 / Sentinel-1)

Semestral: huella construida

Anual: indicadores de brecha y tipología

Después de un evento específico (lluvias extremas, deslizamientos) o de cada actualización del parcelario

**Nivel(es) de acceso.** Uso interno: capas a nivel de predio y de edificación con datos catastrales

Uso institucional: AMDC, Instituto de la Propiedad, SEGOB y UNAH

Público: indicadores agregados por colonia y mapas del Atlas

**Componentes para usar o desplegar.** Repositorio GitHub (scripts, guía y modelo de datos)

Google Earth Engine App con selector de municipio

Dashboard / tablero

Visor web

Base de datos (PostGIS)

GeoServer / servicios OGC (WMS/WFS)

Integración con SIG municipal / catastro

Integración con IDE o geoportal: Atlas Municipal del MDC y Atlas Urbano UNAH

Formularios Kobo/ODK para validación en campo

Hosting

**Uso previsto por otras personas.** La AMDC, para priorizar la actualización catastral, la regularización, el mejoramiento de barrios y la gestión del riesgo. El Instituto de la Propiedad y SEGOB, para orientar programas de regularización y asistencia técnica a municipios. La UNAH, para investigación, docencia y el Atlas Urbano. Otras municipalidades, para aplicar el kit con sus propios datos. La población en general, con énfasis en quienes se interesan por temas urbanos, para consultar indicadores agregados por colonia.

**¿Requiere actualización periódica?.** Sí

**Actualización requerida.** Trimestral (alertas), semestral (huella construida), anual (brecha y tipología) y cada vez que la AMDC actualice el parcelario.

**Pregunta principal.** ¿Cuál es el método más robusto y replicable para medir la brecha entre la ciudad construida, detectada con Copernicus y otros datos satelitales, y la ciudad catastrada, e identificar asentamientos informales a partir de esa brecha, de modo que funcione en el MDC y también en municipios con poca o ninguna información catastral digital?

**Áreas en las que necesita asesoría.** Metodología y análisis geoespacial

Programación y scripts (Google Earth Engine, openEO)

Visualización, dashboards y publicación web

Gestión e interoperabilidad de datos

## Referencias documentales del expediente

- `S24` — `0. Perfiles de Proyectos/Grupo 8_Honduras Planificación Riesgos/Ficha_08_Honduras_Catastro_Asentamientos_MDC REV 2026 10 12.docx`.

- `S25` — `0. Perfiles de Proyectos/Grupo 8_Honduras Planificación Riesgos/Ficha_08_Honduras_UNAH_AMDC_SEGOB_Planificacion_Riesgo.docx`.
