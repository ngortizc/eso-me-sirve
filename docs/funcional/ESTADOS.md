# Estados funcionales

## Publicaciones implementadas en EMS-003

Los estados persistidos en EMS-003 son `DRAFT`, `PUBLISHED`, `PAUSED` y `REMOVED`.

- `DRAFT → PUBLISHED | REMOVED`
- `PUBLISHED → PAUSED | REMOVED`
- `PAUSED → PUBLISHED | REMOVED`
- `REMOVED` es terminal.

Solo `PUBLISHED` aparece en catálogo y detalle públicos. Publicar o reactivar exige título, descripción, categoría, condición, región, comuna y entre una y ocho fotografías, con exactamente una principal. La base de datos valida estas invariantes y bloquea transiciones no permitidas. Editar contenido no cambia el estado por sí solo.

## Estados futuros propuestos — a validar en EMS-005/006

Modelar estados separados para evitar confundir disponibilidad, cobro, derecho a contacto y entrega.

Los futuros `RESERVED` y `GIVEN_AWAY` no se implementan en EMS-003: dependen de las reglas de solicitud, reserva y entrega.

**Reservation:** `REQUESTED`, `ACCEPTED_AWAITING_PAYMENT`, `CONTACT_UNLOCKED`, `HANDOFF_CONFIRMED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `DISPUTED`. Se recomienda separar formalmente contacto del estado de reserva mediante `ContactGrant`; nombres son provisionales.

**Payment:** `CREATED`, `PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED` (si el proveedor lo permite). No inferir pago de la URL de retorno.

**Dispute:** `OPEN`, `UNDER_REVIEW`, `RESOLVED_APPROVED`, `RESOLVED_REJECTED`, `CLOSED`. Evidencia y resolución auditables. `RESOLVED_APPROVED` inicia devolución, no confirma devolución.

**Refund:** `REQUESTED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED` según capacidad real del proveedor.

**ContactGrant:** `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED` (vigencia por definir).

**Concurrencia:** solo una reserva aceptada/vigente para un artículo. Bloqueo transaccional e índice parcial u otro mecanismo comprobado con pruebas de concurrencia.

**Temporalidad:** implementar expiraciones cuando se apruebe plazo; no inventar 24 horas como regla.
