# Eso Me Sirve

Aplicación web responsive/PWA para dar una nueva vida a artículos que otras personas ya no usan. EMS-002 incorpora cuentas reales locales, verificación de correo, recuperación, sesiones y autorización. Publicaciones, solicitudes, reservas, pagos, contacto y entregas continúan como demostración sin persistencia.

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

El prototipo incluye `/explorar`, detalles en `/articulos/[slug]`, `/publicar`, `/mis-cosas` y `/conexion`. Los controles interactivos son locales y las acciones dejan claro que no persisten datos ni ejecutan transacciones. En `/publicar`, las fotografías seleccionadas permanecen solo en memoria y sus previsualizaciones se liberan al eliminarlas o abandonar la vista.

## Comandos

| Comando | Propósito |
|---|---|
| `npm run dev` | Servidor Next.js de desarrollo |
| `npm run typecheck` | TypeScript estricto sin emitir archivos |
| `npm run lint` | ESLint con reglas Next.js/Core Web Vitals |
| `npm run test` | Pruebas unitarias Vitest |
| `npm run test:e2e` | E2E móvil/escritorio, identidad, health/PWA y capturas en `evidencias/EMS-001.1` y `evidencias/EMS-002` |
| `npm run mailbox:latest -- correo tipo` | Lee explícitamente el último correo local de identidad |
| `npm run build` | Compilación standalone de producción |
| `npm run db:migrate` | Migraciones SQL pendientes hacia arriba |
| `docker compose --profile app up --build` | Aplicación y DB en contenedores locales |

Antes del primer E2E instala Chromium una vez con `npx playwright install chromium`. Las pruebas E2E requieren PostgreSQL arriba, migraciones aplicadas y `DATABASE_URL` cargada desde `.env`.

## Arquitectura

- `src/app`: App Router, interfaz y adaptadores HTTP.
- `src/modules`: límites modulares; identidad y perfiles mínimos están implementados, los demás dominios permanecen pendientes.
- `src/shared`: puertos y capacidades transversales mínimas; health y logging en EMS-000.
- `db/migrations`: migraciones SQL ordenadas con `node-pg-migrate`. El ORM continúa pendiente.
- `tests/e2e`: pruebas Playwright en viewport móvil y escritorio.
- `deploy`: referencia Caddy/HTTPS, no un despliegue productivo.

El dominio no importa Next.js, `pg`, persistencia ni APIs externas. Autorización y validación sensible ocurren en servidor. Ningún dato de teléfono o dirección exacta aparece en catálogo, HTML público, metadata, logs o respuestas no autorizadas.

## PWA y caché

El manifiesto y service worker permiten instalación básica cuando el navegador lo soporta. El service worker no intercepta solicitudes ni ofrece operaciones offline: respuestas autenticadas, reservas, pagos, contacto y webhooks no se cachean.

## Contenedores

`compose.yml` publica PostgreSQL solo en `127.0.0.1`, conserva datos en un volumen y aísla la red backend. El contenedor Next.js es multi-stage, standalone y se ejecuta con el usuario no-root `node`.

`compose.production.example.yml` y `deploy/Caddyfile.example` son una referencia de HTTPS con Caddy. No constituyen una configuración productiva aprobada: faltan secret store, backups/restauración, observabilidad, límites, DNS y revisión de seguridad.

## Solución de problemas

- `ready` devuelve 503: revisa `docker compose ps`, `docker compose logs db`, la contraseña duplicada en `DATABASE_URL` y luego ejecuta migraciones.
- Puerto 5432 ocupado: cambia `POSTGRES_PORT` y el puerto en `DATABASE_URL`.
- Docker en Windows no responde: inicia Docker Desktop y confirma WSL2 con `wsl -l -v`.
- Playwright no encuentra navegador: ejecuta `npx playwright install chromium` (en Linux CI se usa `--with-deps`).
- Un volumen conserva credenciales antiguas: no lo borres sin respaldar; crea una base/volumen nuevo o coordina una rotación segura.

## Decisiones y alcance

Las reglas aprobadas están en `docs/negocio/REGLAS_NEGOCIO.md`; las decisiones abiertas, en `docs/arquitectura/DECISIONES.md`. La tarifa de CLP 1.000 es una hipótesis de piloto. Pago confirmado habilita contacto después de aceptación, no equivale a entrega; una devolución requiere incumplimiento acreditado del publicador.

`npm audit --omit=dev` no reporta vulnerabilidades de producción. La cadena de lint presenta una alerta alta de desarrollo en `braces` sin versión corregida publicada y ESLint 9 aparece fuera de soporte; la excepción y el criterio de actualización están registrados en ADR-0008.
