# ADR-0019 — Cifrado y autorización del contacto privado

- Estado: Aprobada
- Fecha: 2026-10-13
- Alcance: EMS-005A

## Contexto

ADR-0018 y RN-15 exigen conservar teléfono y lugar exacto de entrega sin publicarlos ni entregarlos antes de un pago confirmado. PostgreSQL necesita persistirlos, pero una filtración de la base no debe entregar directamente el contenido identificador. También se requiere actualización concurrente segura y una ruta futura de rotación de claves.

## Decisión

Cada publicación tiene como máximo un registro `listing_private_contact`. Teléfono, dirección o descripción del punto e indicaciones se cifran por separado con AES-256-GCM. Cada operación y campo usa un nonce aleatorio de 96 bits y una etiqueta de 128 bits. El AAD incluye publicación, nombre de campo y versión de clave, por lo que intercambiar un ciphertext entre publicaciones o columnas invalida la autenticación.

La clave activa se obtiene de `PRIVATE_CONTACT_KEY_V{n}` o del archivo señalado por `PRIVATE_CONTACT_KEY_V{n}_FILE`, y su versión de `PRIVATE_CONTACT_ACTIVE_KEY_VERSION`. En Docker local se monta como secreto desde un archivo ignorado; el ejemplo productivo exige un secreto externo. Las claves nunca se guardan en PostgreSQL, Git, auditoría ni logs. Se conservan versiones anteriores para poder descifrar durante una rotación futura. Si falta una clave, tiene longitud inválida, existe una configuración ambigua o falla la etiqueta, el caso de uso falla cerrado con una respuesta segura y una categoría técnica minimizada.

`delivery_method` se conserva como metadato categórico no identificador y restringido en PostgreSQL; los valores que identifican o permiten contacto permanecen cifrados. El consentimiento conserva versión y hora de PostgreSQL. La actualización usa una versión optimista bajo bloqueo de la publicación y genera un evento sin contenido privado.

Solo el propietario autenticado puede leer o escribir en EMS-005A. No hay excepción administrativa. Solicitantes y receptores, incluso con reserva aceptada, reciben denegación. Los DTO públicos no importan ni incluyen el registro privado. El contrato `FutureContactAccessAuthorizer` prepara una decisión futura, pero no existe implementación que permita acceso ni tabla `ContactGrant` activa.

## Consecuencias

- Crear una publicación visible inserta publicación, fotografías y contacto cifrado en una transacción.
- Los borradores pueden omitir contacto. Publicar, reactivar y aceptar requieren un registro completo.
- Las publicaciones antiguas se preservan y deben completarse antes de nuevas aceptaciones.
- La pérdida de una clave implica pérdida de descifrado: cada entorno necesita secret store, respaldo cifrado y recuperación ensayada antes de producción.
- La rotación futura agregará una versión, conservará la anterior durante la recodificación y deberá verificar los registros antes de retirar la clave antigua.
- Retención, revocación, rectificación formal, borrado y controversias requieren política legal/operativa antes de producción.
- ADR-0020 congela las escrituras durante una reserva `PENDING_PAYMENT`; lectura del propietario y cifrado no cambian.
