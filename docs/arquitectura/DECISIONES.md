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
| ADR-011 | PENDIENTE | Cancelaciones posteriores al pago, reclamos y retención de datos | La ventana previa al pago se resolvió en EMS-NEG-012/ADR-015 |
| ADR-012 | PENDIENTE | Política de devolución detallada/legal Chile | Validar antes de cobros en producción |
| ADR-013 | PENDIENTE | Proveedores de correo, object storage y pagos | No activar integraciones comerciales sin decisión separada |
| ADR-014 | APROBADA | Puerto de fotografías + adaptador local persistente y Sharp 0.35.5 | Solo desarrollo/piloto local; el proveedor Object Storage continúa pendiente en ADR-013 |
| ADR-015 | APROBADA | Reserva `PENDING_PAYMENT` por 24 horas exactas, hora PostgreSQL y expiración idempotente | EMS-NEG-012; sin pago ni contacto en EMS-004 |
| ADR-016 | APROBADA | Reemplazo fotográfico con nuevo ID y limpieza compensable; IP solo desde proxy confiable | EMS-004.1; Caddy es el único ingreso productivo |
| ADR-017 | APROBADA | Solicitudes no seleccionadas permanecen `PENDING` y su disponibilidad se deriva; nombre/alias es identidad pública mínima | EMS-004.3; sin prioridad, pago ni contacto |
| ADR-018 | APROBADA | El publicador define contacto y dirección o punto de retiro privados al publicar | EMS-005A almacena; ADR-020 precisa la congelación durante reserva; desbloqueo posterior a pago sigue pendiente |
| ADR-019 | APROBADA | Contacto privado cifrado por publicación con AES-256-GCM, claves externas versionadas y autorización exclusiva del propietario en EMS-005A | Sin pago, webhook ni `ContactGrant` activo; rotación y retención operativa pendientes |
| ADR-020 | APROBADA | Contacto privado de solo lectura para el propietario mientras exista una reserva `PENDING_PAYMENT` | EMS-005A.1; nueva edición tras cancelación/vencimiento, regla posterior al pago pendiente para EMS-005C |
