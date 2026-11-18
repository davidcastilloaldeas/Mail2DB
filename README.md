# Mail2DB

Aplicación en español para extraer el contenido de correos guardados como archivos `.eml`.

1. Abre `dist/index.html` en un navegador moderno.
2. Selecciona o arrastra uno o varios correos de hasta 25 MB por archivo.
3. Revisa los campos y el cuerpo del mensaje. Descarga los adjuntos de forma individual o exporta los datos de todos los correos en JSON.

El JSON incluye los nombres, tipos y tamaños de los adjuntos. Los archivos adjuntos se descargan por separado. La aplicación funciona sin instalar dependencias y procesa los correos en memoria en el navegador. La importación es por archivo y corresponde al formato EML.

El analizador MIME integrado es PostalMime 4.2.1, distribuido con su licencia en `dist/POSTAL-MIME-LICENSE.txt`.
