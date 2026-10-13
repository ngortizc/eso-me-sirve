# ADR-0017 — Selección de interesados e identidad pública mínima

Fecha: 2026-10-13
Estado: **APROBADA**

## Contexto

EMS-004 rechazaba automáticamente todas las solicitudes pendientes cuando el publicador aceptaba una. Ese comportamiento conservaba historial, pero impedía seleccionar a otro interesado si la reserva vencía. Las pruebas manuales también mostraron una etiqueta genérica que no permitía distinguir solicitudes y una aparente mezcla de usuarios al usar varias pestañas dentro de la misma sesión de incógnito.

## Decisión

- Pueden coexistir múltiples solicitudes `PENDING` mientras la publicación esté `PUBLISHED`.
- El publicador elige cualquier solicitud elegible, sin prioridad por llegada ni por intento de pago.
- La aceptación no modifica las demás solicitudes. Mientras la publicación esté `RESERVED`, su disponibilidad se deriva como `WAITING_RESERVATION`; este valor es de presentación y no se persiste.
- Al expirar o cancelar la reserva, la publicación vuelve a `PUBLISHED` y las solicitudes todavía `PENDING` se derivan como `ACTIONABLE`.
- `REJECTED`, `CANCELLED` y `ACCEPTED` siguen siendo terminales. No hay selección ni reactivación automática.
- PostgreSQL conserva el lock de publicación y el índice parcial que permite como máximo una reserva `PENDING_PAYMENT` por publicación.
- El propietario ve `identity_user.name` como nombre público o alias del interesado. Antes de construir el DTO, el servidor sustituye valores con forma de correo, teléfono, dirección, URL o token por un seudónimo estable no reversible. El DTO excluye correo, teléfono, dirección, token, ID del solicitante y otros datos internos.
- La sesión se obtiene en cada request desde Better Auth. Pestañas del mismo perfil —también de una misma ventana de incógnito— comparten cookies de forma normal; identidades simultáneas se prueban en contextos de navegador separados.

## Consecuencias

No se requiere migración: los estados persistidos y las restricciones existentes son suficientes. La UI debe distinguir solicitud elegible, en espera y publicación no disponible. Rechazar o cancelar continúa siendo explícito y auditado; aceptar una solicitud en espera falla en servidor porque la publicación no está `PUBLISHED`.

El nombre de cuenta pasa a ser identidad pública limitada frente al propietario de una publicación solicitada. No habilita contacto ni amplía el acceso a perfiles o reservas.
