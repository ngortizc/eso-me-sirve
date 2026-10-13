# Instrucciones de Codex — Eso Me Sirve

Antes de trabajar, leer: `README.md`, `docs/arquitectura/ARQUITECTURA.md`, `docs/negocio/REGLAS_NEGOCIO.md`, `docs/funcional/ESTADOS.md`, `docs/arquitectura/DECISIONES.md`.

- Trabajar sobre tareas EMS claramente delimitadas; primero inspeccionar archivos y mostrar plan breve; terminar con resumen, comandos y resultados reales.
- Nunca asumir que una versión anterior del negocio sigue vigente si contradice estas reglas: el pago **habilita contacto tras reserva aceptada** y la devolución procede ante **incumplimiento acreditado del publicador**.
- No editar decisiones aprobadas de negocio sin consulta explícita ni implementar decisiones pendientes como hechos.
- Monolito modular: dominio independiente de Next.js, Prisma, API externas y persistencia. Validación/autorización del lado servidor.
- Seguridad: nunca filtrar teléfono/dirección en catálogo, búsqueda, HTML, metadata, imágenes, endpoints sin autorización, logs ni respuestas a usuarios no habilitados. No basta ocultar datos con CSS.
- Pago autorizado **no significa** entrega completada. Cobro validado por webhook autenticado e idempotente y consulta a proveedor cuando corresponda. No guardar información de tarjetas.
- Montos en CLP integer; tiempos persistidos UTC, mostrar horario de Chile en interfaz.
- No exponer DB a Internet, no incluir secretos ni subir `.env`; no ejecutar despliegues productivos.
- No codificar servicios reales de pagos, correo o almacenamiento antes de aprobar proveedor.
- Dependencias y contenedores con versiones fijadas; preferir npm y lockfile para EMS-000. Comprobar compatibilidad real antes de instalar.
- Agregar pruebas automáticas de seguridad/estados para cualquier módulo de negocio introducido. No declarar pruebas exitosas sin correrlas.
- No generar funcionalidades ficticias como si estuvieran operativas. No ejecutar `git push` ni hacer cambios remotos sin autorización.
- Mantener actualizados los ADR y backlog al introducir decisiones.

### Política permanente de desarrollo y versionamiento

- La arquitectura obligatoria es un monolito modular Next.js/TypeScript con PostgreSQL, respetando la separación entre dominio, aplicación e infraestructura.
- No añadir dependencias sin una justificación documentada y mantener documentadas las decisiones técnicas y comerciales.
- Cada EMS debe desarrollarse en una rama propia creada desde `main` actualizado; no comenzar una etapa sobre código que no haya sido validado.
- Ejecutar las pruebas correspondientes antes de dar un EMS por completado y no declarar pruebas exitosas si no fueron ejecutadas.
- Mantener documentación, ADR y backlog actualizados con cada cambio de alcance o decisión.
- No realizar commits, merges, push ni despliegues sin autorización explícita.
- Está prohibido usar `git reset --hard`, `git clean` o eliminar ramas sin aprobación explícita.
- No versionar `.env`, secretos, datos operativos, fotografías privadas ni evidencias temporales.
- No modificar migraciones ya aplicadas; todo cambio de esquema debe usar una migración nueva y versionada.
- No eliminar ni modificar datos persistidos sin justificación y autorización.
- Validar en el servidor la autorización para cada recurso privado y proteger los datos personales de publicadores y receptores.
- Informar claramente las limitaciones del entorno y distinguir resultados ejecutados de validaciones pendientes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
