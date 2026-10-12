# Migraciones

`node-pg-migrate` ejecuta los archivos SQL de `migrations/` en orden y registra cada versión en PostgreSQL. EMS-002 agrega las tablas de identidad generadas con la CLI fijada de Better Auth y revisadas como SQL versionado; no se añadió ORM. Cada cambio futuro debe incluir subida, reversión revisada y prueba contra una base vacía. No uses `auth migrate` directamente: `db/migrations` es la única autoridad del esquema.
