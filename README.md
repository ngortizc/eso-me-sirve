# Eso Me Sirve

Aplicación web responsive/PWA para dar una nueva vida a artículos que otras personas ya no usan. EMS-004 incorpora solicitudes persistentes, aceptación transaccional, reservas con 24 horas exactas para pagar y expiración idempotente. Pagos, contacto y entregas continúan fuera de alcance.

## Requisitos

- Node.js 24 LTS (`24.14.0` en CI y contenedores) y npm 11.
- Docker Desktop con WSL2 en Windows, o Docker Engine + Compose en Linux.
- Git. No se necesita PostgreSQL instalado en el host.

## Versiones fijadas

| Tecnología | Versión |
|---|---:|
| Node.js (CI/Docker) | 24.14.0 |
| npm (package manager) | 11.19.0 |
| Next.js | 16.4.0 |
| React | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| PostgreSQL | 18.3-alpine3.23 |
| `pg` / `node-pg-migrate` | 8.23.1 / 9.0.0 |
| Better Auth | 1.7.7 |
| Sharp | 0.35.5 |
| Vitest / Playwright | 5.0.4 / 1.64.0 |

## Configuración local

La plantilla contiene solo valores de desarrollo. Nunca uses credenciales de producción ni subas `.env`.

Linux/WSL2:

```bash
cp .env.example .env
# Cambia POSTGRES_PASSWORD y actualiza DATABASE_URL con el mismo valor.
npm ci
docker compose up -d db
npm run db:migrate
npm run dev
```

Windows PowerShell (Docker Desktop debe estar usando contenedores Linux):

```powershell
Copy-Item .env.example .env
# Cambia POSTGRES_PASSWORD y actualiza DATABASE_URL con el mismo valor.
npm ci
docker compose up -d db
npm run db:migrate
npm run dev
```

Abre `http://localhost:3000`. Comprueba `GET /api/health/live` para proceso y `GET /api/health/ready` para proceso + PostgreSQL. Readiness responde `503` de forma deliberada cuando la base no está disponible.

### Probar registro e ingreso

1. Abre `/registro`, crea una cuenta con contraseña de al menos 12 caracteres y espera la pantalla de verificación.
2. Consulta el enlace local sin enviar correo real:

```powershell
npm run mailbox:latest -- persona@example.cl EMAIL_VERIFICATION
```

3. Abre el enlace una vez. Luego ingresa en `/ingresar`. Para recuperación usa `/recuperar` y consulta `PASSWORD_RESET` con el mismo comando.

El buzón contiene enlaces secretos: úsalo solo en desarrollo, no publiques su salida y no lo habilites en producción. El registro productivo permanece deshabilitado hasta aprobar e implementar un proveedor de correo.

`/explorar` y `/articulos/[slug]` muestran publicaciones públicas reales. Una cuenta verificada puede publicar, solicitar un artículo ajeno y administrar publicaciones, solicitudes y reservas desde `/mis-cosas`. Al aceptar una solicitud se crea una reserva `PENDING_PAYMENT`; el pago permanece deshabilitado y no se muestran datos de contacto.

La administración separa guardar contenido, gestionar fotografías y retirar. Las fotos se pueden agregar, reordenar, reemplazar, marcar como principal y eliminar; una publicación visible conserva al menos una. El retiro pide confirmación, se audita, es terminal y se bloquea durante una reserva activa.

`/mis-cosas` organiza publicaciones, solicitudes enviadas y recibidas en pestañas con contadores reales. «Pendiente de ti» destaca solicitudes por aceptar/rechazar y reservas propias pendientes de pago. La reserva se presenta según el participante autenticado: el publicador ve que está esperando el pago del receptor, su alias público y el plazo, sin tarifa ni acción de pago; el receptor seleccionado ve el artículo gratis, la tarifa de conexión, el vencimiento exacto en horario de Chile y el tiempo informativo restante. El pago continúa deshabilitado.

El propietario elige entre solicitudes elegibles sin prioridad automática. Al aceptar una, las demás permanecen pendientes «En espera» durante la reserva y vuelven a ser elegibles si esta vence o se cancela. El publicador ve únicamente el nombre público o alias; correo, teléfono, dirección y datos internos siguen privados. Para probar A, B y C simultáneamente usa perfiles o contextos de navegador separados: varias pestañas de una misma ventana de incógnito comparten la misma cookie de sesión.

### Usuarios sintéticos para pruebas locales

Con la base local migrada, ejecuta:

```powershell
npm run dev:seed-users
```

El comando solo funciona con `APP_ENV=development`, base y autenticación en loopback. Crea o regenera Publicador A, Receptor B y Receptor C mediante Better Auth, todos verificados y con rol `USER`. No imprime contraseñas: las guarda en `.data/dev-seed-users.json`, archivo ignorado por Git y restringido al usuario local. Repetir el comando rota las contraseñas sin duplicar cuentas e invalida sus sesiones anteriores. Nunca copies ese archivo a commits, CI, capturas o documentación.

Los escenarios completos están en `docs/desarrollo/PRUEBAS_MANUALES_EMS-004.md`. El sembrador no inserta publicaciones ni solicitudes por SQL; deben crearse mediante la aplicación con datos ficticios para conservar validaciones y auditoría.

Las previsualizaciones de `/publicar` usan Object URLs temporales y los liberan al eliminar la foto o desmontar el componente. Al enviar, el servidor detecta el contenido binario, limita dimensiones, rota y recodifica a WebP sin EXIF/GPS, y conserva únicamente variantes de catálogo y detalle bajo `PHOTO_STORAGE_ROOT`. Nunca se sirve la ruta del almacenamiento ni el original recibido.

## Comandos

| Comando | Propósito |
|---|---|
| `npm run dev` | Servidor Next.js de desarrollo |
| `npm run typecheck` | TypeScript estricto sin emitir archivos |
| `npm run lint` | ESLint con reglas Next.js/Core Web Vitals |
| `npm run test` | Pruebas unitarias Vitest |
| `npm run test:integration` | Integración de publicaciones con PostgreSQL real |
| `npm run test:e2e` | E2E móvil/escritorio, identidad, publicaciones, fotografías y capturas ignoradas por Git |
| `npm run mailbox:latest -- correo tipo` | Lee explícitamente el último correo local de identidad |
| `npm run build` | Compilación standalone de producción |
| `npm run db:migrate` | Migraciones SQL pendientes hacia arriba |
| `npm run reservations:expire` | Worker idempotente que vence reservas y libera publicaciones |
| `npm run dev:seed-users` | Crea o rota tres usuarios sintéticos exclusivamente en desarrollo local |
| `docker compose --profile app up --build` | Aplicación y DB en contenedores locales |

Antes del primer E2E instala Chromium una vez con `npx playwright install chromium`. Las pruebas E2E requieren PostgreSQL arriba, migraciones aplicadas y `DATABASE_URL` cargada desde `.env`.

## Arquitectura

- `src/app`: App Router, interfaz y adaptadores HTTP.
- `src/modules`: límites modulares; identidad, perfiles, publicaciones y reservas separan dominio, aplicación e infraestructura.
- `src/shared`: puertos y capacidades transversales mínimas; health y logging en EMS-000.
- `db/migrations`: migraciones SQL ordenadas con `node-pg-migrate`. El ORM continúa pendiente.
- `tests/e2e`: pruebas Playwright en viewport móvil y escritorio.
- `deploy`: referencia Caddy/HTTPS, no un despliegue productivo.

El dominio no importa Next.js, `pg`, persistencia ni APIs externas. Autorización y validación sensible ocurren en servidor. Ningún dato de teléfono o dirección exacta aparece en catálogo, HTML público, metadata, logs o respuestas no autorizadas.

## PWA y caché

El manifiesto y service worker permiten instalación básica cuando el navegador lo soporta. El service worker no intercepta solicitudes ni ofrece operaciones offline: respuestas autenticadas, reservas, pagos, contacto y webhooks no se cachean.

## Contenedores

`compose.yml` publica PostgreSQL solo en `127.0.0.1`, conserva la base en un volumen y monta `./.data/listing-photos` como almacenamiento local persistente. El perfil `app` inicia Next.js y un worker de reservas separado que consulta vencimientos cada minuto. Ambos contenedores usan etapas multi-stage y usuarios no-root. El ejemplo productivo usa un volumen separado únicamente como referencia; Object Storage continúa pendiente.

`compose.production.example.yml` y `deploy/Caddyfile.example` son una referencia de HTTPS con Caddy. No constituyen una configuración productiva aprobada: faltan secret store, backups/restauración, observabilidad, límites, DNS y revisión de seguridad.

## Solución de problemas

- `ready` devuelve 503: revisa `docker compose ps`, `docker compose logs db`, la contraseña duplicada en `DATABASE_URL` y luego ejecuta migraciones.
- Puerto 5432 ocupado: cambia `POSTGRES_PORT` y el puerto en `DATABASE_URL`.
- Docker en Windows no responde: inicia Docker Desktop y confirma WSL2 con `wsl -l -v`.
- Playwright no encuentra navegador: ejecuta `npx playwright install chromium` (en Linux CI se usa `--with-deps`).
- Better Auth no puede derivar una IP por conexión al servir el build directamente sin proxy: la advertencia y el bucket compartido son el comportamiento seguro esperado. En producción mantén Next.js privado detrás de Caddy; no confíes globalmente en `X-Forwarded-For` para ocultar la advertencia.
- Un volumen conserva credenciales antiguas: no lo borres sin respaldar; crea una base/volumen nuevo o coordina una rotación segura.

## Decisiones y alcance

Las reglas aprobadas están en `docs/negocio/REGLAS_NEGOCIO.md`; las decisiones abiertas, en `docs/arquitectura/DECISIONES.md`. EMS-NEG-012 fija 24 horas exactas desde la aceptación hasta el vencimiento del pago. La tarifa de CLP 1.000 es una hipótesis de piloto. Pago confirmado habilita contacto después de aceptación, no equivale a entrega; una devolución requiere incumplimiento acreditado del publicador. ADR-018 define para EMS-005 que el publicador ingresará teléfono y dirección o punto de retiro privados al publicar, actualizables antes de habilitar el pago y visibles únicamente para el receptor seleccionado tras confirmación y autorización del servidor; ese almacenamiento y desbloqueo todavía no están implementados.

`npm audit --omit=dev` no reporta vulnerabilidades de producción. La cadena de lint presenta una alerta alta de desarrollo en `braces` sin versión corregida publicada y ESLint 9 aparece fuera de soporte; la excepción y el criterio de actualización están registrados en ADR-0008.
