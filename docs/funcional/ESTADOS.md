# Estados funcionales propuestos — a validar en EMS-005/006

Modelar estados separados para evitar confundir disponibilidad, cobro, derecho a contacto y entrega.

**Listing:** `DRAFT`, `PUBLISHED`, `RESERVED`, `GIVEN_AWAY`, `PAUSED`, `REMOVED`.

**Reservation:** `REQUESTED`, `ACCEPTED_AWAITING_PAYMENT`, `CONTACT_UNLOCKED`, `HANDOFF_CONFIRMED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `DISPUTED`. Se recomienda separar formalmente contacto del estado de reserva mediante `ContactGrant`; nombres son provisionales.

**Payment:** `CREATED`, `PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED` (si el proveedor lo permite). No inferir pago de la URL de retorno.

**Dispute:** `OPEN`, `UNDER_REVIEW`, `RESOLVED_APPROVED`, `RESOLVED_REJECTED`, `CLOSED`. Evidencia y resolución auditables. `RESOLVED_APPROVED` inicia devolución, no confirma devolución.

**Refund:** `REQUESTED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED` según capacidad real del proveedor.

**ContactGrant:** `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED` (vigencia por definir).

**Concurrencia:** solo una reserva aceptada/vigente para un artículo. Bloqueo transaccional e índice parcial u otro mecanismo comprobado con pruebas de concurrencia.

**Temporalidad:** implementar expiraciones cuando se apruebe plazo; no inventar 24 horas como regla.
