# Arquitectura v1.1 — Eso Me Sirve
Fecha: 2026-10-12. Sustituye las secciones comerciales del borrador v1.0.

## Decisiones aprobadas
Web responsive + PWA, mobile-first; monolito modular Next.js App Router + TypeScript; PostgreSQL y migraciones versionadas; Linux + Docker Compose; Capacitor solo a evaluar tras piloto; pasarela por adaptador con proveedor sin seleccionar; MVP publicaciones, búsqueda, reservas, entrega, pagos y administración.

## Separación de responsabilidades
- `src/app`: interfaz web y endpoints HTTP, sin lógica de dominio centralizada en handlers.
- `src/modules/{identity,profiles,listings,catalog,reservations,handoffs,billing,moderation,notifications,audit}`: dominio independiente, aplicación/casos de uso y adaptadores de infraestructura por módulo.
- `src/shared`: tipos y puertos verdaderamente transversales, no un repositorio de reglas arbitrarias.
- PostgreSQL: estado consistente, constraints, migraciones revisadas, pagos y concesiones de acceso auditables.
- Object storage: fotos mediante puerto; quitar EXIF, controlar formato/tamaño y enlaces temporales cuando corresponda.
- Pasarela: adaptador, validación servidor, webhooks firmados, reintentos idempotentes y conciliación.
- Correo: adaptador; proveedor pendiente; outbox para garantizar entregas lógicas.

## Límites de confianza
Todos los accesos a datos personales se autorizan en servidor y por entidad; filtrar listados, cachés, payloads y metadatos. La dirección de entrega y el teléfono **no** van en respuestas públicas ni HTML generado del lado servidor. La API de contacto exige usuario receptor de reserva aceptada y `ContactGrant` autorizado tras pago confirmado. En un reembolso o incumplimiento, suspender acceso futuro según política aprobada; datos ya vistos no pueden recuperarse.

## Infraestructura mínima de piloto
Navegador/PWA -> HTTPS Caddy -> Next.js -> PostgreSQL (red privada). Next.js -> adaptadores de pagos, email y almacenamiento. `compose.yml` desarrollo y referencia productiva separados; secretos mediante variables no versionadas. Backups cifrados fuera del VPS y pruebas de restauración; healthchecks; observabilidad básica y límites de recursos. Sin Redis, Kubernetes ni microservicios por defecto. Jobs para vencimientos/conciliación mediante proceso idempotente con bloqueo, no cron dentro de múltiples réplicas de frontend sin coordinación.

## Modelo de datos conceptual (no ejecutar migraciones de negocio en EMS-000)
`User`, `Profile`, `Listing`, `ListingPhoto`, `Category`, `Reservation`, `ServiceFeePolicy`, `Payment`, `PaymentAttempt`, `PaymentEvent`, `ContactGrant`, `Handoff`, `Dispute`, `DisputeEvidence`, `Refund`, `AuditEvent`, `OutboxEvent`, `AdminCase`. UUID PK, índices y unicidades explícitas, fechas UTC, CLP como integer. Datos de contacto cifrados o tratados con controles equivalentes apropiados en reposo; acceso auditado sin registrar el valor del dato.

## Puntos abiertos
Autenticación concreta, ORM concreto/versiones, proveedor de storage/mail/pagos, operación de despliegue/respaldos, retención de contacto, parámetros de reserva y reclamación. Ver `DECISIONES.md`; Codex debe estudiar compatibilidad de versiones y no asumir que son decisiones aprobadas.

## Alcance EMS-000
Crear la base técnica y pruebas, **sin** formularios de registros reales, cobros reales, reservas reales ni endpoints de contacto. Pruebas en verde con evidencias.
