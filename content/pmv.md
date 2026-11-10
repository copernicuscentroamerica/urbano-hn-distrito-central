## Evidencias documentales y planificación inicial

- Se recibieron una versión inicial y una revisión fechada 12 de octubre de 2026, con diagrama de método y catálogo de productos esperados.
- No se adjuntaron scripts ejecutables, parcelario, perímetro urbano definitivo, resultados de cruce ni backlog de esta iniciativa.

No se recibió backlog para esta iniciativa. Las tareas que Antigravity derive de esta ficha deben marcarse como propuestas y presentarse para revisión, sin atribuir responsables ni fechas acordadas.

## Especificación de módulos de aplicación

Estos componentes constituyen una propuesta de interfaz basada en el perfil. La primera versión entrega una página de proyecto completa y espacios de integración. Activar un mapa, indicador, descarga o simulador únicamente cuando exista el dato o servicio correspondiente.

- Selector de municipio, inicialmente MDC; nuevas opciones solo cuando haya datos efectivamente incorporados.
- Mapa comparativo de huella construida y cobertura catastral autorizada, con fechas visibles.
- Panel agregado por colonia o celda de 250 m y filtro por tipología A–E, habilitado después de validación.
- Leyenda que diferencia falta de catastro disponible, brecha observada e hipótesis de informalidad.
- Página de metodología y réplica, con enlaces al Atlas Municipal y a los productos de la UNAH cuando existan URLs confirmadas.

### Estados vacíos y navegación

Cuando no haya resultado disponible, mostrar «Resultado pendiente» y explicar qué insumo falta. Conservar los datos faltantes como `null`; no dibujar geometrías inventadas, rellenar indicadores con cero ni presentar gráficos de ejemplo como mediciones. El botón de fork/clonación apunta al repositorio canónico verificado, no al repositorio general del portal.
