# Reservations

Módulo EMS-004 de solicitudes, selección explícita y reservas `PENDING_PAYMENT`.

- `domain`: estados puros y plazo de 24 horas.
- `application`: DTO privados mínimos, puerto de repositorio y contratos futuros de pago.
- `infrastructure`: transacciones PostgreSQL, autorización por participante, auditoría y expiración idempotente.

Las solicitudes no seleccionadas permanecen `PENDING`. Su representación `WAITING_RESERVATION` se deriva del estado `RESERVED` de la publicación y vuelve a `ACTIONABLE` al liberarse, sin reactivar estados terminales ni crear una segunda reserva activa.

No importa Next.js en dominio/aplicación. No implementa pagos, contacto ni proveedor externo.
