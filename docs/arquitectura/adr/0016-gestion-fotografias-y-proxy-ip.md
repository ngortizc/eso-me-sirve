# ADR-0016 — Reemplazo fotográfico atómico y límite de confianza de IP

- Estado: APROBADA
- Fecha: 2026-10-13
- Alcance: EMS-004.1

## Contexto

La edición mezclaba contenido, fotografías y retiro. No existían reemplazo/reordenamiento explícitos y reutilizar una URL de foto con caché `immutable` podía presentar contenido antiguo. Better Auth necesita una IP derivada por infraestructura confiable, pero un `Request` de Next.js directo no expone de forma portable la IP del socket.

## Decisión

El retiro es un caso HTTP separado con lock, versión optimista, prohibición durante `RESERVED` y auditoría. Las mutaciones fotográficas bloquean la publicación y devuelven el recurso persistido.

El reemplazo conserva posición y condición de principal, pero crea un ID nuevo dentro de una transacción. El objeto antiguo entra en `listing_storage_cleanup` antes del commit y se borra después; un fallo queda pendiente. La URL anterior deja de autorizarse por DB y el nuevo ID evita conflictos con la caché pública inmutable.

La cabecera sintética de IP existe solo durante E2E. En producción Caddy es el único ingreso, genera `X-Forwarded-For` y descarta la cabecera de pruebas. No se confían cadenas arbitrarias ni se desactiva el limitador. Una capa anterior a Caddy exige CIDR explícitos y una revisión nueva.

## Consecuencias

- El reemplazo es atómico desde la perspectiva de DB y URL pública.
- La limpieza física es compensable sin borrar referencias vigentes.
- Los formularios tienen pendientes independientes y recuperables.
- El modo local directo puede usar un bucket compartido; la advertencia es honesta cuando no existe proxy confiable.
