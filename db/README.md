# Migraciones

`node-pg-migrate` ejecuta los archivos SQL de `migrations/` en orden y registra cada versión en PostgreSQL. La migración inicial valida el mecanismo sin anticipar el modelo de negocio ni la decisión de ORM. Cada cambio futuro debe incluir subida, reversión revisada y prueba contra una base vacía.
