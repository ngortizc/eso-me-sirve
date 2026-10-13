# Reglas de negocio v1.3 — Eso Me Sirve
Fecha: 2026-10-13. Estado: **aprobado** salvo puntos indicados como pendientes.

## Definiciones aprobadas
RN-01. El artículo publicado es siempre gratuito: precio del bien = CLP 0. No permitir publicar venta, permuta ni subasta.
RN-02. El publicador no paga tarifas de publicación, contacto o entrega.
RN-03. El receptor paga por el **servicio de habilitación de contacto** asociado a una reserva **aceptada**. Hipótesis inicial: CLP 1.000; configurable y persistido como snapshot antes de cobrar. Sin suscripción MVP.
RN-04. Antes de pagar, mostrar el artículo, comuna/ubicación aproximada, condiciones de entrega y tarifa; nunca teléfono o dirección exacta del publicador.
RN-05. El publicador acepta solo una solicitud activa para un artículo. Debe garantizarse en DB mediante transacciones y restricción de concurrencia.
RN-06. Solo el receptor asociado a reserva aceptada y **pago confirmado del lado servidor** puede consultar datos de contacto autorizados para esa reserva. El publicador decide el teléfono y dirección o punto de encuentro que comparte; no se exige domicilio particular.
RN-07. Una reserva no se marca entregada solo porque se pagó; el registro del retiro es independiente de los estados de pago y contacto.
RN-08. La plataforma **devuelve si se acredita incumplimiento del publicador** tras un reclamo y resolución. No existe devolución automática por ausencia de confirmación de entrega. Otros derechos legales, fraude, pago duplicado o error de procesamiento deben contemplarse independientemente.
RN-09. No liberar contacto con capturas de pantalla, redirects de checkout ni afirmaciones del cliente; solo confirmación verificable de pasarela con importes/referencias conciliadas.
RN-10. Cada pago, desbloqueo de contacto, reclamo, resolución y devolución deja un evento de auditoría minimizado y trazable.
RN-11. La publicación puede dejar de estar disponible por retiro, eliminación, expiración o moderación. Acceso a contacto después de suspensión/cierre queda sujeto a política de privacidad y retención todavía pendiente; no perpetuar acceso indefinidamente.
RN-12. No compartir datos de terceros sin autorización; consentimiento informado del publicador sobre quién y cuándo verá su contacto. Evitar teléfono y dirección en descripciones, fotos y metadata.
RN-13. Mientras la publicación esté disponible pueden coexistir múltiples solicitudes. El publicador elige libremente una solicitud elegible: no existe prioridad por llegada ni gana quien intente pagar primero. Al aceptar, las demás solicitudes `PENDING` quedan en espera mientras exista la reserva activa y conservan su historial. Si la reserva vence o se cancela, vuelven a ser elegibles sin reactivar solicitudes `REJECTED` o `CANCELLED` y sin selección automática.
RN-14. El nombre público o alias de la cuenta puede mostrarse al propietario de una publicación para distinguir interesados. Correo, teléfono, dirección, tokens e identificadores internos no forman parte de esa identidad pública ni de los DTO de solicitudes.
RN-15. Para EMS-005, el publicador ingresará su teléfono y una dirección o punto de retiro al publicar el artículo. Estos datos serán privados y podrá actualizarlos antes de habilitar el pago. Solo el receptor seleccionado podrá consultarlos después de un pago confirmado por el servidor y de la autorización correspondiente. Esta decisión define el alcance futuro; EMS-004 no almacena ni desbloquea esos datos.

## Decisión definitiva EMS-NEG-012 — ventana de pago

EMS-NEG-012. Desde la aceptación del publicador, el receptor dispone de **24 horas exactas** para pagar el servicio de conexión. La aceptación y el vencimiento se registran en UTC usando la hora de PostgreSQL. Durante ese plazo existe una única reserva `PENDING_PAYMENT` y la publicación queda `RESERVED`. Al llegar exactamente a `payment_expires_at`, una operación crítica o el worker idempotente cambia la reserva a `EXPIRED`, libera la publicación y conserva el historial. Una operación tardía no puede reactivar la reserva vencida; para volver a participar se requiere una solicitud nueva.

En EMS-004 todavía no existe pago real ni transición `PAID`. Mostrar una cuenta regresiva en el navegador es solo informativo y nunca determina la validez.

La experiencia debe reflejar RN-02 y RN-03 sin ambigüedad: el publicador entrega gratuitamente y nunca recibe un CTA de pago; el receptor seleccionado es la única persona a quien corresponde la tarifa del servicio de conexión. La perspectiva se deriva de la sesión y los registros persistidos, no de parámetros del navegador. Antes de un pago confirmado, ninguna de las dos partes obtiene correo privado, teléfono ni dirección.

## Pendientes que bloquean funcionalidades concretas (NO codificar valores definitivos)
P-02. Cancelación posterior al pago e interacción con suspensiones por moderación. EMS-004 permite cancelar solicitudes pendientes y reservas aún no pagadas.
P-03. Plazo para reclamar; qué constituye incumplimiento y medios de prueba aceptados.
P-04. Plazo administrativo de resolución y apelación; quién asume comisiones de reembolso y si se devuelve el importe íntegro (preferencia provisional: importe íntegro, sujeto a validación jurídica/financiera).
P-05. Proveedor y método de pago; comisiones reales, reversos, contracargos, liquidación e impuestos.
P-06. Si el servicio puede cobrarse en el momento de contacto o requiere condiciones adicionales de derecho de consumidores y privacidad: revisión legal para Chile antes de cobro real.
P-07. Plazo de retención y revocación de datos, tratamiento ante baja de cuenta y reclamos activos.
P-08. Mecanismo de confirmación de entrega y comunicación sin chat.

## Protección frente a abuso
- No asegurar imposibilidad de contacto fuera de la plataforma; existe riesgo de evasión.
- Moderación de texto/fotos para impedir filtraciones deliberadas de contacto; pruebas de acceso a datos desde API y SSR, no solo UI.
- Restricciones de frecuencia, cuentas suspendidas, historial de incumplimientos, revisiones manuales y acciones administrativas auditadas.
