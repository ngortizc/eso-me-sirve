# Pruebas manuales EMS-004

Fecha: 2026-10-13. Alcance: solicitudes, reservas, vencimiento y privacidad sin pagos reales.

## Preparación segura

1. Levantar PostgreSQL local, aplicar migraciones e iniciar la aplicación y el worker de reservas.
2. Ejecutar `npm run dev:seed-users`. Leer las credenciales únicamente desde `.data/dev-seed-users.json`; no copiarlas a documentación, tickets, capturas ni logs.
3. Usar Publicador A, Receptor B y Receptor C. Todos son `USER`, tienen correo `.test` verificado y carecen de teléfono/dirección real.
4. Crear publicaciones ficticias aisladas, con fotografías de demostración sin personas ni datos de contacto. No reutilizar ni alterar publicaciones existentes.
5. Para cada escenario anotar IDs/títulos sintéticos y hora de Chile. Borrar o modificar datos directamente en PostgreSQL no forma parte de estas pruebas.

## Escenarios

### 1. A publica un artículo

**Precondiciones:** sesión de Publicador A; una fotografía ficticia disponible.
**Pasos:** abrir `/publicar`, completar título, descripción, categoría, condición y ubicación aproximada; cargar la foto; publicar.
**Resultado esperado:** aparece el detalle público con estado disponible, «Artículo: Gratis» y el aviso de que solo tras aceptación habrá 24 horas para pagar el servicio de conexión.
**Evidencia sugerida:** captura del detalle y título/slug ficticio; respuesta 201 sin datos privados.

### 2. B solicita el artículo

**Precondiciones:** artículo de A en `PUBLISHED`; sesión de Receptor B.
**Pasos:** abrir el detalle, comprobar el aviso comercial y pulsar «Solicitar artículo»; abrir `/mis-cosas?tab=enviadas`.
**Resultado esperado:** mensaje «Tu solicitud fue enviada. El publicador debe aceptarla antes de que corresponda pagar», solicitud `PENDING`, fotografía/título/fecha reales y opción de cancelar. No aparece cobro ni contacto.
**Evidencia sugerida:** captura del mensaje y de la pestaña; respuesta de solicitudes sin correo, teléfono ni dirección.

### 3. A acepta a B

**Precondiciones:** solicitudes `PENDING` de B y C; sesión de A.
**Pasos:** abrir `/mis-cosas?tab=recibidas`, localizar «Pendiente de ti» y aceptar a B.
**Resultado esperado:** solicitud de B `ACCEPTED`, publicación `RESERVED`, una reserva `PENDING_PAYMENT` y vencimiento exactamente 24 horas después de `accepted_at`. La solicitud de C conserva `PENDING` y se muestra «En espera»; no se rechaza ni obtiene una segunda reserva.
**Evidencia sugerida:** captura antes/después; payload privado con `acceptedAt` y `paymentExpiresAt`; diferencia de 86.400.000 ms.

### 4. B visualiza reserva pendiente de pago

**Precondiciones:** escenario 3 completado; sesión de B.
**Pasos:** abrir `/mis-cosas?tab=enviadas` y «Ver reserva».
**Resultado esperado:** «Tu solicitud fue aceptada», artículo gratis, servicio de conexión `$1.000 CLP`, fecha/hora exacta en Chile, cuenta regresiva basada en `serverNow`, explicación de expiración y botón de pago deshabilitado.
**Evidencia sugerida:** capturas de tarjeta y detalle; comparar vencimiento UI con respuesta servidor.

### 5. C intenta obtener una segunda reserva

**Precondiciones:** reserva activa de B; sesión de C.
**Pasos:** comprobar la solicitud previa de C en «En espera» e intentar abrir/solicitar nuevamente el mismo slug o enviar `POST /api/requests` con ese slug.
**Resultado esperado:** la solicitud previa de C conserva `PENDING`, pero no se crea otra solicitud ni una segunda reserva activa; el detalle público ya no está disponible o la API rechaza el estado y C no accede a la reserva de B.
**Evidencia sugerida:** 404/409 correspondiente y consulta de integración que demuestre una sola reserva activa.

### 6. B cancela una solicitud pendiente

**Precondiciones:** segunda publicación ficticia de A y solicitud `PENDING` de B aún no aceptada.
**Pasos:** en la pestaña enviadas, pulsar «Cancelar solicitud».
**Resultado esperado:** estado `CANCELLED`, desaparece la acción de cancelar, no se crea reserva y queda evento auditado.
**Evidencia sugerida:** captura antes/después y evento `REQUEST_CANCELLED`.

### 7. A rechaza una solicitud

**Precondiciones:** tercera publicación ficticia con solicitud `PENDING` de C; sesión de A.
**Pasos:** abrir recibidas y pulsar «Rechazar».
**Resultado esperado:** estado `REJECTED`, no existe reserva y se conserva el historial sin revelar identidad privada de C.
**Evidencia sugerida:** captura de estado y evento `REQUEST_REJECTED`.

### 8. Una reserva vence a las 24 horas

**Precondiciones:** reserva aislada `PENDING_PAYMENT`; worker activo.
**Pasos:** registrar `accepted_at` y `payment_expires_at`; efectuar esta prueba en un entorno efímero con reloj controlado por el harness o esperar el vencimiento real; ejecutar el worker después del instante exacto. No editar timestamps en la base compartida.
**Resultado esperado:** un milisegundo antes sigue vigente; al alcanzar `payment_expires_at` pasa una sola vez a `EXPIRED`; ejecuciones posteriores del worker no duplican eventos.
**Evidencia sugerida:** salida del test de integración con reloj controlado, ejecución repetida del worker y único evento `PAYMENT_WINDOW_EXPIRED`.

### 9. La publicación queda nuevamente disponible

**Precondiciones:** escenario 8 completado.
**Pasos:** recargar catálogo y detalle por slug; volver a «Solicitudes recibidas» como A.
**Resultado esperado:** publicación `PUBLISHED`, vuelve al catálogo y admite nuevas solicitudes. La solicitud pendiente de C vuelve a ser elegible y A puede seleccionarla; la reserva anterior permanece `EXPIRED` y no se reactiva.
**Evidencia sugerida:** captura del catálogo y consulta de estados publicación/reserva.

### 10. Nadie obtiene contactos privados antes del pago

**Precondiciones:** solicitudes pendientes/rechazadas y reserva `PENDING_PAYMENT`; sesiones de A, B, C y una sesión anónima.
**Pasos:** inspeccionar HTML, metadata y respuestas de catálogo, solicitudes y reservas; probar IDs ajenos con C y anónimo.
**Resultado esperado:** no aparecen teléfono, correo privado, dirección exacta, `ownerId`, claves físicas ni tokens; terceros reciben 401/404 y ni B obtiene contacto porque no existe pago confirmado.
**Evidencia sugerida:** aserciones negativas sobre HTML/JSON y códigos HTTP, sin capturar secretos en pantalla.
