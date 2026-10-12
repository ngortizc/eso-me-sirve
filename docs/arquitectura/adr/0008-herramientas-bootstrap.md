# ADR-0008 — Herramientas del bootstrap

Fecha: 2026-10-12  
Estado: aprobado para EMS-000

## Contexto

El bootstrap requiere una cadena reproducible compatible con Next.js App Router, PostgreSQL, pruebas unitarias/E2E y contenedores Linux. La elección de ORM y los proveedores funcionales siguen pendientes.

## Decisión

- Node.js 24 LTS y npm 11 con dependencias directas exactas y `package-lock.json`.
- Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3 y Tailwind CSS 4.3.3.
- PostgreSQL 18.3 en contenedor; `pg` 8.23.1 y `node-pg-migrate` 9.0.0 para healthcheck y migraciones SQL. Esto no selecciona un ORM.
- Vitest 5.0.4 y Playwright 1.64.0. El runner E2E gestiona el árbol de procesos de Next de forma portable para evitar procesos huérfanos en Windows.
- ESLint 9.39.5 mientras los plugins incluidos por `eslint-config-next` 16.4.0 no declaren compatibilidad con ESLint 10.
- Imagen standalone no-root y Caddy 2.10.2 como referencia HTTPS sin despliegue productivo.

## Consecuencias

La CI y los contenedores fijan Node 24.14.0. Debe revisarse ESLint al actualizar Next: la rama 9 aparece fuera de soporte y su cadena de globbing tiene una alerta alta de desarrollo sin versión corregida disponible; `npm audit --omit=dev` no reporta vulnerabilidades de producción. No usar `npm audit fix --force`, porque propone degradar `eslint-config-next` a una versión incompatible con Next 16.

La migración inicial solo valida el mecanismo y no crea tablas de negocio. ADR-009 continúa pendiente.
