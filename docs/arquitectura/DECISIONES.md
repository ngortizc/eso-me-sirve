# Registro de decisiones

| ID | Estado | Decisión | Observación |
|---|---|---|---|
| ADR-001 | APROBADA | Web responsive + PWA | Capacitor solo después del piloto |
| ADR-002 | APROBADA | Monolito modular Next.js/TypeScript | Un repositorio, separar dominios |
| ADR-003 | APROBADA | PostgreSQL versionado | Migraciones controladas |
| ADR-004 | APROBADA | Linux + Docker Compose | Sin Kubernetes en MVP |
| ADR-005 | APROBADA | Pasarela mediante adaptador | Proveedor pendiente |
| ADR-006 | APROBADA | Artículos gratuitos y publicador sin tarifa | Receptor paga acceso a contacto después de aceptación |
| ADR-007 | APROBADA | Devolución por incumplimiento **acreditado** del publicador | No devolver automáticamente sin investigación |
| ADR-008 | APROBADA | Node 24 LTS/npm 11, Next 16, Tailwind 4, Vitest 5, Playwright 1.64 y Caddy 2.10 de referencia | Compatibilidad validada en EMS-000; ver ADR detallado |
| ADR-009 | PENDIENTE | ORM y versión exactos | EMS-000 usa `pg` + migraciones SQL sin seleccionar ORM; Prisma sigue siendo candidato, no obligación |
| ADR-010 | APROBADA | Better Auth 1.7.7 + PostgreSQL directo para identidad y sesiones | ADR detallado; correo local solo de pruebas, sin proveedor comercial |
| ADR-011 | PENDIENTE | Vigencias, cancelaciones, reclamos, retención de datos | No codificar valores arbitrarios |
| ADR-012 | PENDIENTE | Política de devolución detallada/legal Chile | Validar antes de cobros en producción |
| ADR-013 | PENDIENTE | Proveedores de correo, object storage y pagos | No activar integraciones comerciales sin decisión separada |
| ADR-014 | APROBADA | Puerto de fotografías + adaptador local persistente y Sharp 0.35.5 | Solo desarrollo/piloto local; el proveedor Object Storage continúa pendiente en ADR-013 |
