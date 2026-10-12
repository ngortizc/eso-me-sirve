# Eso Me Sirve — repositorio inicial de especificaciones

Estado: **pre-implementación**, 12 de octubre de 2026. Este repositorio contiene las decisiones, especificaciones e instrucciones para ejecutar EMS-000 con Codex; **no contiene todavía una aplicación ejecutable**.

## Empezar
1. Crear un repositorio Git **privado** `eso-me-sirve` y colocar estos archivos en la raíz.
2. Leer `AGENTS.md`, `docs/arquitectura/ARQUITECTURA.md`, `docs/negocio/REGLAS_NEGOCIO.md` y `docs/funcional/ESTADOS.md`.
3. Abrir el directorio en Codex y ejecutar la tarea descrita en `docs/desarrollo/EMS-000.md`.
4. Revisar los cambios y los resultados de pruebas antes de integrar a `main`.

Decisiones pendientes: ver `docs/arquitectura/DECISIONES.md`. La tarifa de $1.000 CLP es una **hipótesis de piloto**, no un precio inmutable. Los documentos de producto prevalecen sobre prompts antiguos de la misma iniciativa.

## Alcance aprobado
Web responsive/PWA; Next.js + TypeScript; monolito modular; PostgreSQL y migraciones versionadas; Linux + Docker Compose; adaptador de pagos; considerar Capacitor después del piloto. MVP: publicaciones, búsqueda, reservas, entrega, pagos, administración.
