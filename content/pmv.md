## Evidencias documentales y planificación inicial

- Se recibieron una versión inicial y una revisión fechada 12 de octubre de 2026, con diagrama de método y catálogo de productos esperados.
- En la versión inicial no se adjuntaron scripts ejecutables, parcelario, perímetro urbano definitivo, resultados de cruce ni backlog de esta iniciativa (ver el avance técnico de noviembre de 2026, más abajo).

No se recibió backlog para esta iniciativa. Las tareas que Antigravity derive de esta ficha deben marcarse como propuestas y presentarse para revisión, sin atribuir responsables ni fechas acordadas.

## Avance técnico — noviembre de 2026 (preliminar, sin validación institucional)

Estado: `propuesta` en ejecución. Las cifras que produzca este avance son resultados técnicos preliminares, sujetos a revisión del equipo y a validación de campo.

- **Lo catastrado (AMDC).** Se incorporó la planimetría de la AMDC (noviembre de 2026): perímetro urbano oficial PU 2025, 59 sectores catastrales, colonias urbanas y rurales y manzanas. El parcelario (linderos de predio) se usa solo como insumo privado en Google Earth Engine y no se publica a nivel de lote.
- **Lo construido (satélite).** Mancha urbana consolidada a partir de GHSL 2020 (100 m, umbral de 1.000 m² construidos por hectárea, núcleos de 50 ha o más) y edificaciones de Open Buildings v3 con año de aparición de Open Buildings 2.5D Temporal.
- **La brecha.** Cruce de huellas de edificación con predios catastrados. La unidad pública de agregación es la **celda de 250 m** recortada al perímetro urbano: en una prueba por manzanas, la construcción fuera de catastro quedó oculta porque las manzanas ya son unidades catastrales.
- **Temporalidad de lo construido.** Por celda de 250 m se estimó el año de consolidación con Dynamic World (Sentinel-2, 10 m) y se contrastó con Open Buildings 2.5D Temporal (`src/gee/temporalidad_mdc.js`, `src/gee/temporalidad_celdas.py`). Usando el centro histórico como zona de control, Open Buildings 2.5D detecta en 2016 solo alrededor del 75 % de lo que ya existía y no supera el 95 % hasta 2020, por lo que tendería a sobrestimar la construcción reciente; Dynamic World detecta el 96 % en 2016, pero muestra un salto anómalo en 2017 en la periferia. Con línea base 2017, el resultado preliminar sugiere unas 1.570 ha de crecimiento construido entre 2018 y 2025. Esto apunta a revisar la regla de "ocupación reciente" del tipo D, que hoy usa Open Buildings 2.5D.
- **Herramientas.** Script de Earth Engine (`src/gee/brecha_catastral_mdc.js`) y notebook de Colab (`notebooks/brecha_catastral_distrito_central.ipynb`), equivalentes y parametrizados para replicarse en otros municipios.
- **Pendiente.** Revisión de umbrales con el equipo, definición documentada de la tipología A–E, verificación en campo y acuerdo formal de uso del parcelario.

## Especificación de módulos de aplicación

Estos componentes describen el diseño funcional previsto para el visor y el tablero de la iniciativa. Los módulos e indicadores se habilitan de forma progresiva a medida que el equipo incorpora y valida cada conjunto de datos en el repositorio.

- Selector de municipio, inicialmente MDC; nuevas opciones solo cuando haya datos efectivamente incorporados.
- Mapa comparativo de huella construida y cobertura catastral autorizada, con fechas visibles.
- Panel agregado por colonia o celda de 250 m y filtro por tipología A–E, habilitado después de validación.
- Leyenda que diferencia falta de catastro disponible, brecha observada e hipótesis de informalidad.
- Página de metodología y réplica, con enlaces al Atlas Municipal y a los productos de la UNAH cuando existan URLs confirmadas.

### Estados vacíos y navegación

Para garantizar la transparencia técnica, las capas e indicadores en preparación se identifican explícitamente como pendientes hasta contar con datos verificados, evitando sustituir mediciones faltantes con valores simulados. Todos los enlaces de colaboración de esta página conectan directamente con el repositorio oficial de la iniciativa.
