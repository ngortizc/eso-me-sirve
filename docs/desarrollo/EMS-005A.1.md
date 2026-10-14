# EMS-005A.1 — Guardado de contacto privado en Docker

Estado: **IMPLEMENTADO Y VALIDADO**
Fecha: 2026-10-13
Rama: `feature/ems-005a-contacto-privado`

## Causa raíz comprobada

El endpoint real de «Guardar datos privados» es `PUT /api/listings/{listingId}/private-contact`. La ruta valida sesión, correo, payload y consentimiento; luego cifra antes de abrir el caso de uso PostgreSQL. El contenedor `eso-me-sirve-app-1` no tenía `PRIVATE_CONTACT_ACTIVE_KEY_VERSION` ni `PRIVATE_CONTACT_KEY_V1`: Compose aceptaba ambas como vacías cuando el `.env` local todavía no incorporaba la configuración nueva. Por ello AES-256-GCM fallaba cerrado antes de consultar el estado de la publicación y devolvía el 503 genérico observado.

La migración `1760360400000_listing_private_contact` sí estaba aplicada, la tabla existía y PostgreSQL era accesible. El defecto no era una denegación por propiedad ni una falla causada por `RESERVED`. Los logs solo contenían el arranque de Next.js porque el error criptográfico se capturaba sin registrar siquiera una categoría técnica minimizada.

## Corrección aplicada

- `npm run dev:init-contact-key` crea una clave aleatoria de 32 bytes en `.data/secrets/private-contact-key-v1`, nunca la imprime, no sobrescribe una clave válida y restringe permisos/ACL al usuario local.
- `compose.yml` monta ese archivo como secreto de solo lectura y entrega al proceso únicamente su ruta y la versión activa. La clave ya no queda en una variable de entorno inspeccionable.
- El runner E2E local reutiliza la misma clave que Docker cuando comparte PostgreSQL; CI conserva una clave efímera junto con su base efímera. Así una misma versión de clave no representa materiales distintos dentro de la base local.
- El cargador criptográfico conserva compatibilidad con variables inyectadas por un secret store, admite `PRIVATE_CONTACT_KEY_V{n}_FILE`, rechaza configuraciones ambiguas y valida Base64/32 bytes antes de usar AES-256-GCM.
- Los errores distinguen configuración (503), integridad criptográfica (503), autorización/no existencia (404), validación (400), conflicto de negocio (409) y falla técnica inesperada (500). El navegador recibe mensajes seguros; los logs reciben solo categorías, nunca claves ni datos descifrados.
- Se añadió `1760364000000_freeze_private_contact_during_active_reservation.sql` sin modificar la migración anterior.

Configuración local requerida:

```powershell
npm run dev:init-contact-key
docker compose --profile app up -d --build app
```

El archivo está cubierto por `.gitignore` mediante `.data/`. En producción, `compose.production.example.yml` referencia un secreto externo; no incluye ni genera claves. La custodia, backup cifrado y restauración siguen siendo requisitos previos al despliegue.

## Comportamiento durante reservas activas

| Situación | Propietario | Receptor/tercero |
|---|---|---|
| Sin `PENDING_PAYMENT` | Consulta y actualiza con control optimista | Sin acceso |
| Con `PENDING_PAYMENT` | Consulta en vista de solo lectura; escritura 409 | Sin acceso |
| Reserva vencida o cancelada | Puede volver a actualizar antes de otra aceptación | Sin acceso |
| Pago futuro confirmado | Pendiente de snapshot/versionado en EMS-005C | No implementado en EMS-005A.1 |

El repositorio bloquea la fila de publicación y comprueba la reserva activa antes de escribir. PostgreSQL aplica además un trigger `BEFORE INSERT OR UPDATE`, de modo que una escritura fuera del caso de uso tampoco puede alterar el contacto vigente. No se agregaron estados ni se tocaron reservas o historiales existentes.

## Archivos principales

- `src/modules/private-contact/infrastructure/private-contact-crypto.ts`
- `src/modules/private-contact/infrastructure/postgres-private-contact-repository.ts`
- `src/app/api/listings/[listingId]/private-contact/route.ts`
- `src/components/listings/private-contact-section.tsx`
- `scripts/init-private-contact-key.mjs`
- `scripts/verify-docker-private-contact.mjs`
- `compose.yml` y `compose.production.example.yml`
- `db/migrations/1760364000000_freeze_private_contact_during_active_reservation.sql`
- pruebas unitarias, integración y E2E de contacto/reservas

## Pruebas y evidencia

Resultados reales comprobados durante la implementación:

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npm test`: 19 archivos, 62 pruebas, correcto; incluye carga por archivo, configuración ausente/ambigua, nonces y mensajes públicos sin detalles sensibles.
- `npm run db:migrate`: migración nueva aplicada y segunda ejecución sin pendientes.
- `npm run test:integration`: 4 archivos, 20 pruebas, correcto; incluye lectura del propietario, rechazo al tercero, bloqueo de repositorio y trigger durante reserva, y edición después de cancelar.
- `npm run test:docker-contact`: correcto contra el contenedor real. Chromium guardó desde «Administrar publicación», recargó, verificó ciphertext/nonce/tag/versión en PostgreSQL, reinició `app`, volvió a descifrar con la misma clave, rechazó a otro usuario y comprobó ausencia de los valores sintéticos en API pública y logs.
- `npm run test:e2e`: 62/62, correcto en Chromium escritorio y Pixel 7; valida vista de solo lectura, 409 servidor, persistencia sin cambio y ausencia de acceso del receptor.
- `npm run build`: correcto; 26 rutas generadas y el endpoint privado continúa dinámico.
- `git diff --check`: correcto, sin errores de whitespace.

Evidencia local ignorada por Git y revisada visualmente:

- `evidencias/EMS-005A.1/docker-contacto-privado-escritorio.png`
- `evidencias/EMS-005A.1/chromium-desktop-contacto-reserva-solo-lectura.png`
- `evidencias/EMS-005A.1/chromium-mobile-contacto-reserva-solo-lectura.png`

Las capturas utilizan exclusivamente teléfono y punto ficticios. La migración fue repetida sin pendientes y el diff no contiene errores de whitespace.

## Riesgos restantes

- El secreto local en archivo resuelve Docker de desarrollo, no reemplaza un gestor de secretos productivo.
- Rotación, backup/restauración, retención y recuperación ante pérdida de clave requieren procedimiento operativo probado.
- Contactos sintéticos creados antes de EMS-005A.1 con la antigua clave E2E separada pueden seguir en la base local y no son recuperables con la clave Docker nueva; no se borraron ni recifraron automáticamente. Los datos no sintéticos exigen recuperar su clave original.
- EMS-005C debe definir un snapshot inmutable o versionado del contacto confirmado antes de habilitar pagos.
- La publicación ficticia creada por la verificación Docker permanece como borrador aislado; no se alteraron cuentas ni publicaciones personales.

## Estado de Git

Cambios locales sin commit en `feature/ems-005a-contacto-privado`. No hubo merge, push ni despliegue.
