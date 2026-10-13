# ADR-0015 — Reservas y expiración de 24 horas

- Estado: APROBADA
- Fecha: 2026-10-13
- Alcance: EMS-004 / EMS-NEG-012

## Contexto

Aceptar una solicitud debe reservar un único artículo durante 24 horas exactas, resistir aceptaciones concurrentes y liberar disponibilidad aunque el navegador esté cerrado. El proyecto no tiene un orquestador de jobs aprobado ni puede confundir un temporizador cliente con autoridad de negocio.

## Decisión

La aceptación bloquea en una misma transacción PostgreSQL la solicitud y la publicación, crea una reserva `PENDING_PAYMENT`, fija `accepted_at = CURRENT_TIMESTAMP` y `payment_expires_at = accepted_at + interval '24 hours'`, cambia la publicación a `RESERVED`, rechaza otras solicitudes pendientes y escribe eventos correlacionados.

Un índice parcial único permite una sola reserva `PENDING_PAYMENT` por publicación. Otro índice parcial impide solicitudes `PENDING` duplicadas del mismo usuario. Triggers diferidos exigen correspondencia exacta entre solicitud `ACCEPTED` y reserva.

La función PostgreSQL `reservation_expire_due(limit, correlation_id)` selecciona vencimientos con `FOR UPDATE SKIP LOCKED`, cambia cada reserva una sola vez a `EXPIRED`, libera la publicación y audita ambos efectos. `npm run reservations:expire` ejecuta un lote; el servicio Compose `reservation-worker` ejecuta el mismo proceso en modo continuo cada minuto, separado del frontend. Las operaciones críticas y lecturas privadas realizan además la comprobación antes de actuar.

La UI calcula una cuenta regresiva informativa usando `serverNow`, pero PostgreSQL conserva la autoridad. No existe `PAID`, checkout, webhook, proveedor, datos de tarjeta ni concesión de contacto en EMS-004.

## Consecuencias

- Los terminales `EXPIRED` y `CANCELLED` no pueden volver a `PENDING_PAYMENT`.
- Una publicación `RESERVED` no puede editarse desde los casos de uso del propietario; se evita invalidar la futura liberación.
- El worker es idempotente y admite concurrencia. El intervalo, monitorización y alertas productivas siguen siendo responsabilidad de la operación del entorno.
- EMS-005 deberá crear pagos y contacto sobre contratos separados y verificar pasarela, monto, moneda, referencia, vencimiento e idempotencia antes de desbloquear datos.
