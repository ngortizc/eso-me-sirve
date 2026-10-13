# ADR-0018 — Contacto privado del publicador y habilitación futura

- Estado: Aprobada
- Fecha: 2026-10-13
- Alcance de implementación: EMS-005

## Contexto

El receptor seleccionado necesita coordinar el retiro únicamente después de pagar el servicio de conexión. EMS-004 no almacena ni revela teléfono o dirección exacta y no procesa pagos. Para diseñar EMS-005 hace falta fijar cuándo aporta el publicador esos datos, hasta cuándo puede corregirlos y quién podrá consultarlos.

## Decisión

Al publicar un artículo, el publicador ingresará un teléfono y una dirección o punto de retiro. Ambos serán datos privados. El publicador podrá actualizarlos antes de habilitar el pago de la reserva.

Solo el receptor seleccionado podrá acceder a esos datos después de que el servidor confirme el pago y autorice explícitamente la concesión de contacto correspondiente a esa reserva. La identidad pública o el estado `PENDING_PAYMENT` por sí solos no conceden acceso.

Esta aprobación no implementa todavía campos, almacenamiento, endpoints, pagos ni desbloqueo. EMS-005 deberá definir cifrado o protección en reposo, auditoría minimizada, retención, revocación, consentimiento, contratos de API y validaciones de concurrencia antes de escribir código productivo.

## Consecuencias

- Catálogo, detalle público, metadata, logs, solicitudes y reservas previas al pago seguirán sin teléfono ni dirección exacta.
- La edición del dato privado deberá cerrarse o versionarse al habilitar el pago para evitar que cambie el alcance aceptado por el receptor.
- El acceso necesitará pago confirmado, receptor de la reserva y autorización activa; ningún parámetro del navegador podrá sustituir esas comprobaciones.
- Persisten como decisiones pendientes el proveedor de pago, la política legal, la retención y la revocación posterior al pago.
