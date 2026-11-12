## Arquitectura metodológica en Google Earth Engine y Python

1. **Delimitación de la mancha construida y cohorte de consolidación (2017–2025):** Identificación de núcleos consolidados (15,204 ha en GHSL) y estimación del periodo de aparición de edificaciones en **2,934 celdas de 250 m** (*Consolidada a 2017*: 2,164 celdas; *Crecimiento 2018–2021*: 514 celdas; *Crecimiento 2022–2025*: 194 celdas; *Dispersa*: 62 celdas).
2. **Cálculo de brecha física catastral (`p_fuera_catastro`):** Medición en cada celda de 250 m de la proporción de huella edificada detectada desde satélite que se ubica fuera de la cobertura parcelaria/amanzanada registrada.
3. **Clasificación morfológica en Tipologías A–E (`src/gee/tipologia_ae.py`):** Agrupamiento multivariado de **3,241 celdas habitadas** combinando brecha catastral, densidad constructiva, pendiente topográfica (Copernicus DEM GLO-30) y dinámica temporal de crecimiento.
