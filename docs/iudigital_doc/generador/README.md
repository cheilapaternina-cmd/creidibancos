# Generador del documento de arquitectura (.docx)

Scripts que producen **`../CreditSmart_Arquitectura_de_la_Solucion_generado.docx`**:
el documento de arquitectura de CreditSmart para la actividad de la IU Digital
(44 páginas, 21 figuras, 32 tablas).

El documento no se escribe a mano: se genera desde estos scripts para que los
datos que cita —número de productos, tasas, plazos, conteos de archivos y de
líneas, rutas, contratos, resultados de las pruebas— se puedan corregir en un solo
sitio y volver a compilar.

## Archivos

| Archivo | Qué hace |
|---|---|
| `build_doc.py` | Infraestructura del documento: estilos, encabezado con el logo institucional, pie con «Página X de Y», y las funciones de contenido (`h1`, `para`, `add_table`, `code_block`, `callout`, `figure`, `diagram`, `boxes_row`, `field_placeholder`). Define también la ruta de salida. |
| `content_doc.py` | El contenido: portada, tabla de contenido y las 20 secciones. **Es el archivo que hay que editar** para cambiar el documento. |
| `charts.py` | Los 8 gráficos en `img/`, con la paleta exacta de `assets/css/02-tokens.css`. |
| `img/` | PNG generados por `charts.py` a 200 ppp. Se sobrescriben en cada ejecución. |
| `refmedia/` | Se crea al vuelo: el logo institucional extraído de `../Pedraza_Jeremy_TallerDOFA.docx`. No hace falta versionarlo. |

## Regenerar

```bash
cd docs/iudigital_doc/generador
python charts.py          # solo si cambian datos de los gráficos
python content_doc.py     # produce el .docx
```

Requiere `python-docx` y `matplotlib`:

```bash
python -m pip install python-docx matplotlib
```

Para revisar el resultado sin abrir Word (opcional, requiere LibreOffice):

```bash
soffice --headless --convert-to pdf --outdir preview \
  ../CreditSmart_Arquitectura_de_la_Solucion_generado.docx
```

## Regla de escritura: nunca sobre el archivo editado a mano

`build_doc.py` escribe **siempre** en
`CreditSmart_Arquitectura_de_la_Solucion_generado.docx`.

El archivo sin sufijo —`CreditSmart_Arquitectura_de_la_Solucion.docx`— es la copia
de trabajo que se edita a mano (recortes, reordenamientos, capturas pegadas) y el
generador no la toca. La regla existe porque una regeneración ya sobrescribió una
vez una versión editada a mano, sin posibilidad de recuperarla.

Si alguna vez hay que cambiar el destino, es una única línea en `build_doc.py`
(`OUT_DOCX`).

## Patrón de diseño que replica

Tomado del documento guía `../Pedraza_Jeremy_TallerDOFA.docx`, leyendo su XML:

| Elemento | Valor |
|---|---|
| Tipografía | Arial 11 pt, interlineado 1,15, cuerpo justificado |
| Título 1 | Arial 16 pt negrita, `#1F3864` |
| Título 2 | Arial 13 pt negrita, `#2E75B6` |
| Título 3 | Arial 12 pt negrita, `#1F4D78` |
| Tablas | Centradas, borde `#7F7F7F`, fila de encabezado `#1F3864` con texto blanco 9 pt, filas alternas `#F2F6FB`, ancho fijo |
| Página | Carta, márgenes de 1 pulgada (superior 3,3 cm para dejar sitio al logo) |
| Encabezado / pie | Logo institucional a la derecha · «Página X de Y» centrado, como campos de Word |

Añadidos propios del documento: avisos de color (`callout`), bloques de código
monoespaciados, diagramas de flujo con un chip de color por capa, y recuadros
amarillos como espacios editables.

## Espacios editables

`content_doc.py` deja 34 huecos amarillos para completar antes de entregar:
portada (nombre, docente, curso y NRC, ciudad y fecha), URL del repositorio, tabla
de commits, cuatro capturas de pantalla, columna de autoevaluación de la rúbrica y
observaciones.

La tabla de contenido es un campo de Word: al abrir el documento hay que hacer
clic derecho sobre ella y elegir «Actualizar campos».

## Datos que el documento cita del código

Si se cambia el código, estos son los valores que hay que revisar en
`content_doc.py` (sección 4.1 «Cifras de la solución» y las tablas de las
secciones 11, 13 y 15):

- archivos y líneas de JavaScript y de CSS,
- número de productos, sus montos, tasas, plazos y requisitos,
- resultados de cada opción del filtro por monto,
- rutas, contratos, casos de uso y dependencias del contenedor,
- resultado de las tres suites de pruebas.

Los gráficos de tasas, rangos y plazos leen su propia copia de los productos en
`charts.py` (constante `PRODUCTS`): hay que actualizarla en paralelo.
