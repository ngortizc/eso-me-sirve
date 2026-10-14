# ADR-0020 — Congelación del contacto durante una reserva activa

- Estado: Aprobada
- Fecha: 2026-10-13
- Alcance: EMS-005A.1

## Contexto

ADR-0018 permitió al propietario actualizar el contacto antes de habilitar el pago, pero no fijó con suficiente precisión si esa edición seguía abierta después de aceptar una solicitud. Cambiar teléfono o lugar mientras existe una reserva `PENDING_PAYMENT` alteraría silenciosamente la coordinación que el receptor podría pagar durante su ventana vigente.

## Decisión

Sin reserva activa, el propietario autenticado puede consultar y actualizar el contacto privado. Cuando existe una reserva `PENDING_PAYMENT`, puede consultarlo, pero no crear ni modificar teléfono, modalidad, lugar o indicaciones. El bloqueo se valida en servidor bajo el mismo lock de publicación utilizado por la operación y se refuerza con un trigger PostgreSQL. Al vencer o cancelarse la reserva, el propietario puede volver a actualizar antes de aceptar a otro interesado.

El receptor no obtiene acceso antes de un pago confirmado y una concesión futura. La edición o versionado posterior al pago se definirá en EMS-005C; no se sustituirá silenciosamente el contacto ya compartido.

## Consecuencias

- `RESERVED` continúa siendo un estado de publicación existente; no se agrega una transición ni se modifica el historial.
- El endpoint mantiene lectura exclusiva del propietario y devuelve conflicto de negocio al intentar escribir durante `PENDING_PAYMENT`.
- La interfaz muestra una vista de solo lectura durante la reserva.
- La migración nueva impide que una escritura directa eluda la regla; no modifica migraciones ya aplicadas.
- La regla de snapshot/versionado posterior al pago permanece pendiente.
