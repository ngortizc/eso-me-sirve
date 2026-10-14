# Arquitectura v1.4 — Eso Me Sirve
Fecha: 2026-10-13. Incorpora solicitudes, reservas, aislamiento de sesiones y perspectiva segura de participante hasta EMS-004.4.

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

Caddy es el único ingreso previsto en producción y Next.js permanece en una red privada. Better Auth usa la IP reenviada por ese límite confiable; la cabecera sintética de pruebas solo se habilita durante E2E. No se confían cabeceras de IP cuando la aplicación es accesible directamente.

## Gestión de publicaciones y fotografías

Guardar contenido, administrar fotografías y retirar son casos separados. El reemplazo fotográfico usa un ID público nuevo y una transacción que conserva posición/principal, mientras la clave anterior entra en una cola de limpieza compensable. Un retiro autorizado bloquea la publicación, respeta reservas activas y deja un evento minimizado.

## Infraestructura mínima de piloto
Navegador/PWA -> HTTPS Caddy -> Next.js -> PostgreSQL (red privada). Next.js -> adaptadores de pagos, email y almacenamiento. `compose.yml` desarrollo y referencia productiva separados; secretos mediante variables no versionadas. Backups cifrados fuera del VPS y pruebas de restauración; healthchecks; observabilidad básica y límites de recursos. Sin Redis, Kubernetes ni microservicios por defecto. Jobs para vencimientos/conciliación mediante proceso idempotente con bloqueo, no cron dentro de múltiples réplicas de frontend sin coordinación.

## Modelo de datos
EMS-004 implementa `ArticleRequest`, `Reservation` y `ReservationEvent` con UUID, claves foráneas, índices parciales, estados explícitos y fechas UTC. `Payment`, `PaymentAttempt`, `PaymentEvent`, `ContactGrant`, `Handoff`, `Dispute`, `Refund`, `OutboxEvent` y `AdminCase` continúan conceptuales. CLP se representa como integer. Los eventos no registran datos personales.

La aceptación bloquea solicitud y publicación, crea una única reserva `PENDING_PAYMENT`, fija una ventana exacta de 24 horas con hora PostgreSQL y cambia la publicación a `RESERVED`. Otras solicitudes `PENDING` no se mutan: su disponibilidad se deriva como `WAITING_RESERVATION` hasta que la publicación vuelva a `PUBLISHED`. La función idempotente `reservation_expire_due` usa `FOR UPDATE SKIP LOCKED`, vence reservas y libera la publicación, permitiendo que el publicador seleccione después otro interesado elegible. El navegador solo presenta el tiempo restante.

La sesión se resuelve por request desde Better Auth y PostgreSQL; no existe identidad global en proceso. Las páginas privadas leen `headers()` y por ello se renderizan dinámicamente en Next.js 16, mientras todos los endpoints `/api/*` envían `Cache-Control: no-store`. Una ventana de incógnito comparte cookies entre sus pestañas; usuarios simultáneos requieren perfiles o contextos de navegador separados.

El contacto privado usa AES-256-GCM y claves versionadas externas. Docker local monta la clave desde `.data/secrets` como archivo secreto; producción deberá suministrarla mediante un secret store. Una reserva `PENDING_PAYMENT` congela la escritura del contacto tanto en el caso de uso transaccional como mediante trigger PostgreSQL, pero conserva la lectura del propietario. Cancelación o vencimiento libera nuevamente la edición; el snapshot posterior al pago queda pendiente para EMS-005C.

El DTO privado de reserva deriva `PUBLISHER` o `RECIPIENT` en infraestructura al comparar el actor autenticado con las relaciones persistidas. No se acepta un rol o perspectiva enviado por URL o formulario. Solo la vista del publicador incluye el alias público minimizado del receptor; nunca incorpora correo, teléfono, dirección, tokens ni identificadores internos. La interfaz ramifica exclusivamente sobre esa perspectiva emitida por servidor. Los códigos de auditoría permanecen estables en PostgreSQL y se traducen mediante una capa de presentación, sin mutar el historial.

## Puntos abiertos
ORM concreto/versiones, proveedores de storage/mail/pagos, programación y monitorización operativa del worker, despliegue/respaldos, retención de contacto, política posterior al pago y reclamación. Ver `DECISIONES.md`; no asumir que los puntos pendientes están aprobados.

## Alcance EMS-000
Crear la base técnica y pruebas, **sin** formularios de registros reales, cobros reales, reservas reales ni endpoints de contacto. Pruebas en verde con evidencias.
