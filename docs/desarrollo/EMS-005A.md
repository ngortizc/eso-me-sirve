# EMS-005A — Contacto privado y datos seguros de entrega

Estado: **IMPLEMENTADO Y VALIDADO**
Fecha: 2026-10-13
Rama: `feature/ems-005a-contacto-privado`

## Resumen ejecutivo

EMS-005A incorpora un registro privado uno-a-uno por publicación. El publicador aporta teléfono chileno normalizado, modalidad, dirección o punto de retiro, indicaciones opcionales y consentimiento. Los valores identificadores se cifran con AES-256-GCM antes de llegar a PostgreSQL. Solo el propietario autenticado puede leerlos o actualizarlos; visitantes, terceros, solicitantes y receptores con reserva aceptada siguen sin acceso.

No se implementaron pagos, webhooks, confirmaciones ficticias, desbloqueo ni `ContactGrant` activo. La reserva `PENDING_PAYMENT` y sus 24 horas no cambian.

## Arquitectura

- `src/modules/private-contact/domain`: modelo, normalización chilena, modalidades, consentimiento y validación pura.
- `src/modules/private-contact/application`: puerto de persistencia, DTO privado del propietario y contrato futuro de autorización posterior al pago.
- `src/modules/private-contact/infrastructure`: AES-256-GCM y repositorio PostgreSQL autorizado.
- `src/app/api/listings/[listingId]/private-contact`: GET/PUT privados, identidad derivada de sesión y respuestas `private, no-store`.
- El catálogo y las reservas conservan DTO explícitos que no referencian contacto. `OwnerListing` solo recibe el booleano no sensible `privateContactComplete`.

Crear una publicación visible inserta publicación, ubicación pública, fotografías y contacto cifrado en una única transacción. Un borrador puede omitir el contacto. La transición a `PUBLISHED` y la aceptación que lleva a `RESERVED` vuelven a comprobar la existencia del registro dentro de la transacción.

## Migración

`1760360400000_listing_private_contact.sql` agrega:

- `listing_private_contact`, con FK y unicidad por publicación;
- ciphertext, nonce de 12 bytes y etiqueta de 16 bytes por teléfono, ubicación e indicaciones;
- modalidad restringida a `HOME_ADDRESS` o `MEETING_POINT`;
- versión de clave, consentimiento, fechas UTC y versión optimista;
- trigger de versión/fecha de actualización;
- constraint trigger diferido para nuevas publicaciones, reactivaciones y aceptaciones.

No se modificó ninguna migración anterior ni se realizó backfill. Las publicaciones y reservas existentes permanecen intactas. Una publicación antigua sin contacto mantiene su estado e historial, pero no puede generar una nueva reserva hasta que el propietario complete el registro. La liberación de reservas antiguas no se bloquea.

## Cifrado y claves

Cada campo identificador usa AES-256-GCM con nonce aleatorio nuevo. El contexto autenticado es `ems:listing-private-contact:{listingId}:{field}:v{keyVersion}`. Esto liga ciphertext, columna, publicación y versión de clave. La etiqueta se verifica antes de devolver texto y un error criptográfico produce fallo cerrado sin incluir datos ni causa sensible en la respuesta.

Variables:

- `PRIVATE_CONTACT_ACTIVE_KEY_VERSION=1`
- `PRIVATE_CONTACT_KEY_V1=<32 bytes aleatorios en Base64>` para inyección directa controlada, o `PRIVATE_CONTACT_KEY_V1_FILE=<ruta al secreto>` para Docker/archivo montado.

Las claves permanecen fuera de PostgreSQL y Git. EMS-005A.1 añadió `npm run dev:init-contact-key` y el montaje de `.data/secrets/private-contact-key-v1` para Docker local; no se genera una clave al arrancar ni se imprime. Para rotar en el futuro se agrega V2, se cambia la versión activa, se recifran registros con verificación y solo entonces se retira V1. Antes de producción se requieren secret store, respaldo cifrado separado y prueba periódica de restauración.

## Consentimiento y privacidad

La casilla nunca aparece marcada. Registra versión `2026-10-13-v1` y hora PostgreSQL; una actualización exige confirmar nuevamente. El texto explica datos, finalidad, ausencia en catálogo, compartición futura solo después de pago confirmado y posible auditoría de acceso.

EMS-005A permite rectificación directa por el propietario; EMS-005A.1 la congela durante una reserva `PENDING_PAYMENT` y la recupera tras cancelación o vencimiento. Acceso formal, eliminación, retención por obligaciones legales o controversias y revocación posterior al pago requieren política aprobada antes de producción; la interfaz no promete borrado inmediato.

## Matriz de autorización

| Actor | Consultar | Actualizar | Motivo |
|---|---:|---:|---|
| Propietario autenticado y verificado | Sí | Sí, salvo retirada o reserva `PENDING_PAYMENT` | Relación `listing.owner_id` persistida y ADR-0020 |
| Administrador no propietario | No | No | No existe excepción por rol |
| Solicitante pendiente | No | No | Solicitud no concede contacto |
| Receptor con `PENDING_PAYMENT` | No | No | Reserva aceptada no equivale a pago ni concesión |
| Tercero autenticado | No | No | Respuesta opaca sin contenido |
| Visitante | No | No | Requiere sesión |

Cambiar `listingId`, query strings como `paid=true`, roles o IDs enviados por el navegador no altera la decisión. El endpoint rechaza campos de identidad y pago controlados por cliente.

## Interfaz

`/publicar` agrega «Datos privados para coordinar el retiro», mobile-first, con explicación y consentimiento. Guardar borrador no exige contacto; publicar sí. La edición carga el contacto desde el endpoint privado sin caché y separa esta operación del contenido, fotografías y retiro. `/mis-cosas` muestra únicamente si el propietario debe completar datos, nunca sus valores.

## Pruebas y evidencias

Resultados reales al cierre de la ejecución se registran aquí:

- `npm run db:migrate`: correcto; migración aplicada conservando la base local.
- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npm run test`: 18 archivos, 58 pruebas, correcto.
- `npm run test:integration`: 4 archivos, 20 pruebas, correcto.
- reinicio `docker compose restart db` + repetición de integración: PostgreSQL volvió saludable y 20/20 pruebas pasaron conservando el volumen; el cifrado también se recupera desde una nueva instancia con la misma clave.
- `npm run test:e2e`: 62/62, correcto en Chromium escritorio y Pixel 7; incluye compilación de producción previa.
- `npm run build`: correcto; 26 páginas generadas y la ruta privada permanece dinámica.
- `git diff --check`: correcto.

Los E2E generan capturas ignoradas por Git en:

- `evidencias/EMS-005A/chromium-desktop-contacto-privado-propietario.png`
- `evidencias/EMS-005A/chromium-mobile-contacto-privado-propietario.png`

Ambas capturas fueron revisadas visualmente: muestran la sección separada, el consentimiento desmarcado tras guardar, el mensaje de confirmación y la composición responsive. La fotografía negra corresponde al PNG mínimo sintético del caso automatizado, no a una fotografía real.

## Archivos principales

- migración `1760360400000_listing_private_contact.sql`;
- módulo `src/modules/private-contact`;
- rutas de publicaciones y contacto privado;
- formularios de publicación/edición y tarjetas de `/mis-cosas`;
- pruebas unitarias, integración y E2E;
- `.env.example`, Compose, README, reglas, estados, ADR-0018/0019 y backlog.

## Riesgos y decisiones pendientes

- Secret store, custodia, rotación ensayada y recuperación de claves antes de producción.
- Política legal de retención, eliminación, controversias y trazabilidad de accesos.
- Definir proveedor de pago y verificación de webhook idempotente en EMS-005B.
- Diseñar snapshot/versionado del contacto que verá el receptor al habilitar pago.
- Activar `ContactGrant` solo tras confirmación verificable; el contrato actual nunca concede acceso.
- La modalidad de entrega es metadato categórico no identificador; teléfono, ubicación e indicaciones son los valores cifrados.

## Estado de Git

Cambios locales sin commit sobre `feature/ems-005a-contacto-privado`. No se realizó merge, push ni despliegue.
