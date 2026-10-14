# Estados funcionales

## Publicaciones

Los estados persistidos son `DRAFT`, `PUBLISHED`, `PAUSED`, `RESERVED` y `REMOVED`.

- `DRAFT → PUBLISHED | REMOVED`.
- `PUBLISHED → PAUSED | REMOVED` por decisión del propietario.
- `PAUSED → PUBLISHED | REMOVED`.
- `PUBLISHED → RESERVED` ocurre únicamente al aceptar una solicitud dentro de la transacción de reserva.
- `RESERVED → PUBLISHED` ocurre únicamente al cancelar o vencer la reserva pendiente de pago.
- `REMOVED` es terminal.

Solo `PUBLISHED` aparece en catálogo y detalle públicos. Publicar o reactivar exige título, descripción, categoría, condición, región, comuna, datos privados de contacto y entrega con consentimiento, y entre una y ocho fotografías, con exactamente una principal. Una publicación `RESERVED` no se puede editar desde los casos de uso públicos del artículo; desde EMS-005A.1 el propietario puede consultar su contacto privado, pero no modificarlo mientras exista `PENDING_PAYMENT`. `GIVEN_AWAY` continúa fuera de alcance.

`DRAFT`, `PAUSED` y `REMOVED` pueden persistir sin fotografías porque no son estados disponibles. `PUBLISHED` nunca puede quedar sin una; reemplazo, reordenamiento, principal y eliminación se validan bajo lock. `REMOVED` se ejecuta mediante una acción confirmada separada, conserva auditoría y sigue siendo terminal.

## Solicitudes implementadas en EMS-004

- `PENDING → ACCEPTED | REJECTED | CANCELLED`.
- `ACCEPTED`, `REJECTED` y `CANCELLED` son terminales.
- Una aceptación crea exactamente una reserva en la misma transacción. Las demás solicitudes conservan `PENDING`: la UI deriva `WAITING_RESERVATION` mientras la publicación esté `RESERVED`, sin introducir un estado persistido nuevo.
- Al vencer o cancelar la reserva, la publicación vuelve a `PUBLISHED` y esas solicitudes pendientes vuelven a ser `ACTIONABLE`. El publicador elige; no hay prioridad por orden ni aceptación automática.
- Una solicitud `REJECTED` o `CANCELLED` nunca se reactiva automáticamente.
- Existe como máximo una solicitud `PENDING` por publicación y solicitante.

## Reservas implementadas en EMS-004

- La reserva nace en `PENDING_PAYMENT` al aceptar una solicitud.
- `PENDING_PAYMENT → EXPIRED | CANCELLED`.
- `EXPIRED` y `CANCELLED` son terminales y liberan la publicación si sigue `RESERVED`.
- `accepted_at` y `payment_expires_at = accepted_at + 24 hours` usan `timestamptz` y hora PostgreSQL.
- El worker y las operaciones críticas vencen con `payment_expires_at <= CURRENT_TIMESTAMP`, bloqueo transaccional e idempotencia.
- No existe transición `PAID` en EMS-004. La cuenta regresiva del navegador es informativa y no autoriza acciones.

La perspectiva visible no es un estado ni un parámetro aceptado del cliente. El servidor la deriva para cada reserva comparando la sesión autenticada con el receptor y el propietario persistidos. En `PENDING_PAYMENT`, el publicador ve «Esperando pago del receptor», el alias seleccionado y su fecha límite, sin tarifa, cronómetro ni CTA de pago. El receptor ve «Tu solicitud fue aceptada», artículo gratis, tarifa, fecha y cuenta regresiva informativa. Los eventos conservan sus códigos técnicos en PostgreSQL, pero la interfaz los traduce a descripciones en español.

## Estados futuros propuestos — a validar desde EMS-005

Modelar estados separados para evitar confundir disponibilidad, cobro, derecho a contacto y entrega.

**Payment:** `CREATED`, `PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED` (si el proveedor lo permite). No inferir pago de la URL de retorno.

**Dispute:** `OPEN`, `UNDER_REVIEW`, `RESOLVED_APPROVED`, `RESOLVED_REJECTED`, `CLOSED`. Evidencia y resolución auditables. `RESOLVED_APPROVED` inicia devolución, no confirma devolución.

**Refund:** `REQUESTED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED` según capacidad real del proveedor.

**ContactGrant:** `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED` (vigencia por definir).

**Concurrencia:** solo una reserva aceptada/vigente para un artículo, protegida con bloqueo de fila, transacción e índice parcial único.

**Temporalidad:** EMS-NEG-012 aprobó e implementó 24 horas exactas. Cualquier cambio exige una nueva decisión explícita y una migración versionada.

## Preparación de contacto en EMS-005A

La completitud del contacto privado no introduce un estado nuevo de publicación, reserva ni pago. Es una precondición persistida para `DRAFT → PUBLISHED`, `PAUSED → PUBLISHED` y `PUBLISHED → RESERVED`. Una publicación antigua sin contacto conserva su estado e historial, pero el servidor impide una nueva aceptación hasta que su propietario complete los datos. `ContactGrant` continúa siendo solo un contrato futuro: no existe concesión activa ni acceso del receptor en EMS-005A.
