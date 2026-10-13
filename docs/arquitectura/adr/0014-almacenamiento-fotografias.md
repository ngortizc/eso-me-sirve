# ADR-0014 — Puerto de fotografías y almacenamiento local persistente

- Estado: APROBADA
- Fecha: 2026-10-12
- Alcance: EMS-003

## Contexto

EMS-003 requiere fotografías persistentes sin seleccionar todavía un proveedor comercial. Guardar binarios en PostgreSQL acoplaría la base transaccional al tráfico y crecimiento de medios; guardar rutas del cliente o servir archivos originales expondría path traversal, metadata privada y contenido no confiable.

Se evaluaron un directorio público de Next.js, binarios en PostgreSQL, un proveedor Object Storage inmediato y un puerto con adaptador local. Los tres primeros se descartan para esta etapa: el directorio público evita autorización y procesamiento, PostgreSQL no es el almacén adecuado y ADR-013 mantiene pendiente el proveedor externo.

## Decisión

Definir `PhotoStorage` en la capa de aplicación e implementar `LocalPhotoStorage` para desarrollo y piloto local. PostgreSQL conserva únicamente una clave aleatoria opaca, orden, indicador principal, dimensiones, formato, tamaño y checksum de las variantes.

El adaptador usa Sharp 0.35.5 para:

- comprobar que los bytes representan JPEG, PNG o WebP y coinciden con el tipo declarado;
- rechazar más de 10 MB, más de 8.000 píxeles por lado, más de 40 megapíxeles y contenido animado;
- aplicar orientación, decodificar y recodificar a WebP;
- generar variantes `catalog` (máximo 640 px) y `detail` (máximo 1.600 px);
- eliminar metadata EXIF/GPS al no copiar metadata al resultado;
- escribir primero en un directorio temporal y renombrarlo de forma atómica.

Las claves son 32 bytes aleatorios codificados en hexadecimal. El adaptador rechaza cualquier clave o variante fuera del contrato y resuelve rutas únicamente bajo `PHOTO_STORAGE_ROOT`. Un endpoint controlado entrega las variantes procesadas; nunca expone la ruta física ni sirve el original.

La creación guarda los archivos antes de la transacción y ejecuta una compensación si PostgreSQL falla. Las eliminaciones se registran en `listing_storage_cleanup` antes de intentar borrar el archivo, para permitir reintentos. El almacenamiento local vive en `.data/listing-photos` fuera de Git; Docker Compose lo monta en `/app/storage/listings`.

## Consecuencias

- Dominio, casos de uso y rutas no dependen de Sharp ni del filesystem.
- Un futuro adaptador Object Storage debe conservar claves opacas, variantes y semántica de eliminación idempotente.
- No se conservan originales: una nueva estrategia de variantes requerirá volver a cargar o aceptar la calidad de la variante de detalle como fuente, decisión a revisar antes de producción.
- Quedan pendientes un worker de reintentos/limpieza, escaneo antimalware, moderación visual y límites en proxy antes de cargar el cuerpo completo.
- El proveedor, región, cifrado, URLs firmadas/CDN, retención y lifecycle de Object Storage continúan pendientes en ADR-013.
