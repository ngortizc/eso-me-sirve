# ADR-0010 — Identidad con Better Auth y PostgreSQL

- Estado: APROBADA
- Fecha: 2026-10-12
- Alcance: EMS-002

## Contexto

EMS-002 requiere credenciales propias, verificación de correo, recuperación, sesiones revocables y roles sobre Next.js 16 y PostgreSQL. El proyecto ya usa `pg` y migraciones SQL versionadas; seleccionar un ORM solo para identidad agregaría otra abstracción sin resolver una necesidad del dominio.

Se evaluaron:

- **Better Auth:** integra App Router mediante `Request`/`Response`, acepta `pg.Pool`, incluye correo/contraseña, verificación, recuperación, sesiones de base de datos y rate limiting.
- **Auth.js:** solución mantenida y compatible con Next.js, pero el ciclo completo de credenciales propias, verificación y recuperación requiere más implementación específica de la aplicación.
- **Servicios alojados de identidad:** reducen operación interna, pero introducen un proveedor externo y duplican o desplazan la fuente de datos de identidad antes de aprobar proveedor y residencia/privacidad.
- **Implementación propia:** descartada por el riesgo de diseñar criptografía, sesiones y recuperación desde cero.

## Decisión

Usar `better-auth` **1.7.7**, fijado en lockfile, con su adaptador PostgreSQL directo sobre `pg.Pool`. No se incorpora ORM. La aplicación conserva `node-pg-migrate` como única autoridad de migraciones: el SQL inicial fue generado con `auth` 1.7.7, revisado y versionado en `db/migrations`.

- Contraseñas: `scrypt` nativo de Better Auth; nunca se devuelven ni registran hashes.
- Sesiones: identificador opaco en cookie HttpOnly, SameSite=Lax y Secure en producción; estado y revocación en PostgreSQL; duración de siete días y frescura de treinta minutos.
- Correo: obligatorio antes del login. Verificación y recuperación vencen en 15 minutos. Recuperar contraseña revoca las sesiones previas.
- Roles: `USER` por defecto y `ADMIN` controlado por servidor; `role` no se acepta como input del cliente.
- Abuso: rate limiting persistido en PostgreSQL, con reglas más estrictas para login y recuperación. Mensajes de recuperación y registro no confirman la existencia de una cuenta.
- Autorización: DAL y repositorios verifican sesión, rol y propiedad junto al acceso de datos; esconder controles en React no concede permisos.

Los enlaces sensibles se guardan en el buzón local con el token dentro del fragmento `#`, que no forma parte de la petición HTTP ni del log de acceso. La verificación canjea el token por POST y registra solo un digest SHA-256 irreversible para imponer un único uso. Better Auth mantiene el token de recuperación en su tabla de verificación y lo consume al restablecer la contraseña.

## Correo de desarrollo

`DatabaseEmailDelivery` es un adaptador exclusivo de `APP_ENV=development` y `EMAIL_DELIVERY_MODE=database`. No envía mensajes reales. El comando explícito `npm run mailbox:latest -- correo tipo` permite leer el último enlace local; la aplicación no publica un endpoint de buzón.

No se selecciona proveedor comercial en EMS-002. En producción, el registro queda deshabilitado mientras no exista un adaptador aprobado: esto evita crear cuentas imposibles de verificar. El futuro proveedor deberá implementar el puerto `IdentityEmailDelivery` y controles operativos de entrega.

## Consecuencias

- Better Auth es una dependencia de infraestructura; dominio y reglas de autorización puras no la importan.
- Su Kysely interno es un detalle transitivo del adaptador, no el ORM de la aplicación ni una decisión sobre ADR-009.
- Una actualización exige regenerar y revisar el delta de esquema, ejecutar la matriz completa y comprobar avisos de seguridad.
- El rate limiting por IP depende de configurar correctamente proxies confiables; antes de producción deben fijarse los encabezados y rangos del proxy real.
- La tabla de digests consumidos necesitará una tarea segura de limpieza por retención cuando exista un job runner aprobado.
