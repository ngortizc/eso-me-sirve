# Pago, contacto y devolución — diseño funcional

## Flujo feliz
1. Publicador crea artículo gratuito y define comuna visible + contacto/dirección o punto de entrega privado.
2. Receptor solicita reserva sin conocer datos privados.
3. Publicador acepta **una** solicitud; se calcula precio de servicio vigente y se captura snapshot de tarifa.
4. Receptor ve precio y condiciones y procede a pasarela mediante un intento de pago con identificador único.
5. El backend comprueba webhook firmado/autenticado, vinculación reserva/usuario/monto/moneda y estado del proveedor; reintentos son idempotentes.
6. Una transacción actualiza pago a `CONFIRMED`, genera habilitación de contacto para esa reserva, audita y encola notificación.
7. El receptor autenticado consulta endpoint protegido `GET /api/v1/reservations/{id}/contact`; autorización exige ser receptor y habilitación vigente; nunca incluir datos privados en listados públicos.
8. Se coordina y registra resultado de entrega de manera independiente.

## Reclamos y devoluciones
1. Receptor abre caso vinculado a pago/reserva, con motivo y evidencias minimizadas.
2. Moderador revisa antecedentes y posible versión del publicador; mantiene log de decisión.
3. Si se **acredita incumplimiento**, autoriza devolución según política legal/comercial aplicable.
4. Backend pide reembolso al adaptador con clave idempotente; `REFUND_REQUESTED` no significa `REFUNDED`.
5. Solo webhook/respuesta de conciliación autenticada confirma `REFUNDED`; estados fallidos requieren revisión/reintento controlado.
6. Registrar efectos sobre publicación/reserva/contacto de acuerdo a reglas de cancelación pendientes.

## Integración técnica
`PaymentGateway` debe contemplar `createCheckout`, `getPaymentStatus`, `verifyWebhook`, `refund`, `getRefundStatus`; interfaz conceptual, forma final sujeta al proveedor. Registrar `PaymentAttempt`, `PaymentEvent(providerEventId UNIQUE)`, `ContactGrant`, `Dispute`, `Refund`. No conservar PAN/CVV. Asegurar consistencia con DB, transacciones, outbox y reconciliación periódica.

## Casos de prueba mínimos futuros
- Pago duplicado/webhook repetido no habilita dos veces ni genera doble cargo.
- URL de checkout simulada o callback manipulado no desbloquea.
- Propietario, solicitante no aceptado y usuario anónimo no pueden ver contacto.
- Dos aceptaciones simultáneas: solo una gana.
- Reclamo sin resolución favorable no devuelve automáticamente.
- Reembolso fallido no se marca completado.
- Restricciones de publicación y cancelación no dejan concesiones de contacto huérfanas.
